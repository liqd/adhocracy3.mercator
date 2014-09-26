"""Colander schema extensions."""
from collections import Sequence
from collections import OrderedDict
from datetime import datetime

from pyramid.path import DottedNameResolver
from pyramid.traversal import find_resource
from pyramid.traversal import resource_path
from pytz import UTC
from pyramid.traversal import find_interface
from substanced.util import get_dotted_name
from zope.interface.interfaces import IInterface
import colander
import pytz

from adhocracy_core.interfaces import ILocation
from adhocracy_core.utils import normalize_to_tuple
from adhocracy_core.exceptions import RuntimeConfigurationError
from adhocracy_core.utils import get_sheet
from adhocracy_core.utils import get_iresource
from adhocracy_core.interfaces import SheetReference
from adhocracy_core.interfaces import IPool
from adhocracy_core.interfaces import IResource
from adhocracy_core.interfaces import IPostPoolSheet


class AdhocracySchemaNode(colander.SchemaNode):

    """Subclass of :class: `colander.SchemaNode` with extended keyword support.

    The constructor accepts these additional keyword arguments:

        - ``readonly``: Disable deserialization. Default: False
    """

    readonly = False

    def deserialize(self, cstruct=colander.null):
        """ Deserialize the :term:`cstruct` into an :term:`appstruct`. """
        if self.readonly and cstruct != colander.null:
            raise colander.Invalid(self, 'This field is ``readonly``.')
        return super().deserialize(cstruct)


def raise_attribute_error_if_not_location_aware(context) -> None:
    """Ensure that the argument is location-aware.

    :raise AttributeError: if it isn't
    """
    context.__parent__
    context.__name__


def validate_name_is_unique(node: colander.SchemaNode, value: str):
    """Validate if `value` is name that does not exists in the parent object.

    Node must a have a `parent_pool` binding object attribute
    that points to the parent pool object
    with :class:`adhocracy_core.interfaces.IPool`.

    :raises colander.Invalid: if `name` already exists in the parent or parent
                              is None.
    """
    parent = node.bindings.get('parent_pool', None)
    try:
        parent.check_name(value)
    except AttributeError:
        msg = 'This resource has no parent pool to validate the name.'
        raise colander.Invalid(node, msg)
    except KeyError:
        msg = 'The name already exists in the parent pool.'
        raise colander.Invalid(node, msg, value=value)
    except ValueError:
        msg = 'The name has forbidden characters or is not a string.'
        raise colander.Invalid(node, msg, value=value)


class Identifier(AdhocracySchemaNode):

    """Like :class:`Name`, but doesn't check uniqueness..

    Example value: blu.ABC_12-3
    """

    schema_type = colander.String
    default = ''
    missing = colander.drop
    relative_regex = '[a-zA-Z0-9\_\-\.]+'
    validator = colander.All(colander.Regex('^' + relative_regex + '$'),
                             colander.Length(min=1, max=100))


@colander.deferred
def deferred_validate_name(node: colander.SchemaNode, kw: dict) -> callable:
    """Check that the node value is a valid child name."""
    return colander.All(validate_name_is_unique,
                        *Identifier.validator.validators)


class Name(AdhocracySchemaNode):

    """ The unique `name` of a resource inside the parent pool.

    Allowed characters are: "alpha" "numeric" "_"  "-" "."
    The maximal length is 100 characters, the minimal length 1.

    Example value: blu.ABC_12-3

    This node needs a `parent_pool` binding to validate.
    """

    schema_type = colander.String
    default = ''
    missing = colander.drop
    validator = deferred_validate_name


class Email(AdhocracySchemaNode):

    """String with email address.

    Example value: test@test.de
    """

    schema_type = colander.String
    default = ''
    missing = colander.drop
    validator = colander.Email()


_ZONES = pytz.all_timezones


class TimeZoneName(AdhocracySchemaNode):

    """String with time zone.

    Example value: UTC
    """

    schema_type = colander.String
    default = 'UTC'
    missing = colander.drop
    validator = colander.OneOf(_ZONES)


class Interface(colander.SchemaType):

    """A ZOPE interface in dotted name notation.

    Example value: adhocracy_core.sheets.name.IName
    """

    def serialize(self, node, value):
        """Serialize interface to dotted name."""
        if value in (colander.null, ''):
            return value
        return get_dotted_name(value)

    def deserialize(self, node, value):
        """Deserialize path to object."""
        if value in (colander.null, ''):
            return value
        try:
            return DottedNameResolver().resolve(value)
        except Exception as err:
            raise colander.Invalid(node, msg=str(err), value=value)


class AbsolutePath(AdhocracySchemaNode):

    """Absolute path made with  Identifier Strings.

    Example value: /bluaABC/_123/3
    """

    schema_type = colander.String
    relative_regex = '/[a-zA-Z0-9\_\-\.\/]+'
    validator = colander.Regex('^' + relative_regex + '$')


def string_has_no_newlines_validator(value: str) -> bool:
    """Check for new line characters."""
    return False if '\n' in value or '\r' in value else True  # noqa


class SingleLine(colander.SchemaNode):  # noqa

    """ UTF-8 encoded String without line breaks.

    Disallowed characters are linebreaks like: \n, \r.
    Example value: This is a something.
    """

    schema_type = colander.String
    default = ''
    missing = colander.drop
    validator = colander.Function(string_has_no_newlines_validator,
                                  msg='New line characters are not allowed.')


@colander.deferred
def deferred_content_type_default(node: colander.MappingSchema,
                                  kw: dict) -> str:
    """Return the content_type for the given `context`."""
    context = kw.get('context', None)
    iresource = get_iresource(context)
    return iresource.__identifier__ if iresource else ''


class ContentType(SingleLine):

    default = deferred_content_type_default


def get_sheet_cstructs(context: IResource, request) -> dict:
    """Serialize and return the `viewable`resource sheet data."""
    sheets = request.registry.content.resource_sheets(context, request,
                                                      onlyviewable=True)
    cstructs = {}
    for name, sheet in sheets.items():
        appstruct = sheet.get()
        schema = sheet.schema.bind(context=context, request=request)
        cstruct = schema.serialize(appstruct)
        cstructs[name] = cstruct
    return cstructs


class ResourceObject(colander.SchemaType):

    """Schema type that de/serialized a :term:`location`-aware object.

    Example values:  'http://a.org/bluaABC/_123/3' '/blua/ABC/'

    If the value is an url with fqdn the the :term:`request` binding is used to
    deserialize the resource.

    If the value is an absolute path the :term:`context` binding is used
    to  deserialize the resource.

    The default serialization is the resource url.
    """

    def __init__(self, serialization_form='url'):
        self.serialization_form = serialization_form
        """
        :param:`serialization_form`:
            If 'url` the :term:`request` binding is used to serialize
            to the resource url.
            If `path` the :term:`context` binding is used to  serialize to
            the :term:`Resource Location` path.
            If `content` the :term:`request` and  'context' binding is used to
            serialize the complete resource content and metadata.
            Default `url`.
        """

    def serialize(self, node, value):
        """Serialize object to url or path.

        :param node: the Colander node.
        :param value: the resource to serialize
        :return: the url or path of that resource
        """
        if value in (colander.null, ''):
            return ''
        try:
            raise_attribute_error_if_not_location_aware(value)
            return self._serialize_location_or_url_or_content(node, value)
        except AttributeError:
            raise colander.Invalid(node,
                                   msg='This resource is not location aware',
                                   value=value)

    def _serialize_location_or_url_or_content(self, node, value):
        if self.serialization_form == 'path':
            assert 'context' in node.bindings
            return resource_path(value)
        if self.serialization_form == 'content':
            assert 'request' in node.bindings
            request = node.bindings['request']
            schema = ResourcePathAndContentSchema().bind(request=request,
                                                         context=value)
            cstruct = schema.serialize({'path': value})
            sheet_cstructs = get_sheet_cstructs(value, request)
            cstruct['data'] = sheet_cstructs
            return cstruct
        else:
            assert 'request' in node.bindings
            request = node.bindings['request']
            return request.resource_url(value)

    def deserialize(self, node, value):
        """Deserialize url or path to object.

        :param node: the Colander node.
        :param value: the url or path :term:`Resource Location` to deserialize
        :return: the resource registered under that path
        :raise colander.Invalid: if the object does not exist.
        """
        if value is colander.null:
            return value
        try:
            resource = self._deserialize_location_or_url(node, value)
            raise_attribute_error_if_not_location_aware(resource)
        except (KeyError, AttributeError):
            raise colander.Invalid(
                node,
                msg='This resource path does not exist.', value=value)
        return resource

    def _deserialize_location_or_url(self, node, value):
        if value.startswith('/'):
            assert 'context' in node.bindings
            context = node.bindings['context']
            return find_resource(context, value)
        else:
            assert 'request' in node.bindings
            request = node.bindings['request']
            application_url_len = len(request.application_url)
            if application_url_len > len(str(value)):
                raise KeyError
            # Fixme: This does not work with :term:`virtual hosting`
            path = value[application_url_len:]
            return find_resource(request.root, path)


class Resource(AdhocracySchemaNode):

    """A resource SchemaNode.

    Example value:  'http://a.org/bluaABC/_123/3'
    """

    default = ''
    missing = colander.drop
    schema_type = ResourceObject


class ResourcePathSchema(colander.MappingSchema):

    content_type = ContentType()

    path = Resource()


class ResourcePathAndContentSchema(ResourcePathSchema):

    data = colander.SchemaNode(colander.Mapping(unknown='preserve'),
                               default={})


def _validate_reftype(node: colander.SchemaNode, value: ILocation):
        reftype = node.reftype
        isheet = reftype.getTaggedValue('target_isheet')
        if not isheet.providedBy(value):
            error = 'This Resource does not provide interface %s' % \
                    (isheet.__identifier__)
            raise colander.Invalid(node, msg=error, value=value)


class Reference(Resource):

    """Schema Node to reference a resource that implements a specific sheet.

    The constructor accepts these additional keyword arguments:

        - ``reftype``: :class:` adhocracy_core.interfaces.SheetReference`.
                       The `target_isheet` attribute of the `reftype` specifies
                       the sheet that accepted resources must implement.
                       Storing another kind of resource will trigger a
                       validation error.
        - ``backref``: marks this Reference as a back reference.
                       :class:`adhocracy_core.sheet.ResourceSheet` can use this
                       information to autogenerate the appstruct/cstruct.
                       Default: False.
    """

    reftype = SheetReference
    backref = False
    validator = colander.All(_validate_reftype)


class Resources(colander.SequenceSchema):

    """List of :class:`Resource:`s."""

    resource = Resource()
    default = []
    missing = []


def _validate_reftypes(node: colander.SchemaNode, value: Sequence):
    for resource in value:
        _validate_reftype(node, resource)


class References(Resources):

    """Schema Node to reference resources that implements a specific sheet.

    The constructor accepts these additional keyword arguments:

        - ``reftype``: :class:`adhocracy_core.interfaces.SheetReference`.
                       The `target_isheet` attribute of the `reftype` specifies
                       the sheet that accepted resources must implement.
                       Storing another kind of resource will trigger a
                       validation error.
        - ``backref``: marks this Reference as a back reference.
                       :class:`adhocracy_core.sheet.ResourceSheet` can use this
                       information to autogenerate the appstruct/cstruct.
                       Default: False.
    """

    reftype = SheetReference
    backref = False
    validator = colander.All(_validate_reftypes)


class UniqueReferences(References):

    """Schema Node to reference resources that implements a specific sheet.

    The order is preserved, duplicates are removed.

    Example value: ["http:a.org/bluaABC"]
    """

    def preparer(self, value: Sequence) -> list:
        if value is colander.null:
            return value
        value_dict = OrderedDict.fromkeys(value)
        return list(value_dict)


class Text(AdhocracySchemaNode):

    """ UTF-8 encoded String with line breaks.

    Example value: This is a something
                   with new lines.
    """

    schema_type = colander.String
    default = ''
    missing = colander.drop


class Password(AdhocracySchemaNode):

    """ UTF-8 encoded text.

    Minimal length=6, maximal length=100 characters.
    Example value: secret password?
    """

    schema_type = colander.String
    default = ''
    missing = colander.drop
    validator = colander.Length(min=6, max=100)


@colander.deferred
def deferred_date_default(node: colander.MappingSchema, kw: dict) -> datetime:
    """Return current date."""
    return datetime.utcnow().replace(tzinfo=UTC)


class DateTime(AdhocracySchemaNode):

    """ DateTime object.

    This type serializes python ``datetime.datetime`` objects to a
    `ISO8601 <http://en.wikipedia.org/wiki/ISO_8601>`_ string format.
    The format includes the date, the time, and the timezone of the
    datetime.

    Example values: 2014-07-21, 2014-07-21T09:10:37, 2014-07-21T09:10:37+00:00

    The default/missing value is the current datetime.

    Constructor arguments:

    :param 'tzinfo': This timezone is used if the :term:`cstruct` is missing
                     the tzinfo. Defaults to UTC
    """

    schema_type = colander.DateTime
    default = deferred_date_default
    missing = deferred_date_default


def _get_post_pool(context: IPool, iresource_or_service_name) -> IResource:
    if IInterface.providedBy(iresource_or_service_name):
        return find_interface(context, iresource_or_service_name)
    else:
        return context.find_service(iresource_or_service_name)


@colander.deferred
def deferred_get_post_pool(node: colander.MappingSchema, kw: dict) -> IPool:
    """Return the post_pool path for the given `context`.

    :raises adhocracy_core.excecptions.RuntimeConfigurationError:
        if the :term:`post_pool` does not exists in the term:`lineage`
        of `context`.
    """
    context = kw['context']
    post_pool = _get_post_pool(context, node.iresource_or_service_name)
    if post_pool is None:
        context_path = resource_path(context)
        post_pool_type = str(node.iresource_or_service_name)
        msg = 'Cannot find post_pool with interface or service name {}'\
              ' for context {}.'.format(post_pool_type, context_path)
        raise RuntimeConfigurationError(msg)
    return post_pool


class PostPool(Reference):

    """Reference to the common place to post resources used by the this sheet.

    Constructor arguments:

    :param 'iresource_or_service_name`:
        The resource interface/:term:`service` name of this
        :term:`post_pool`. If it is a :term:`interface` the
        :term:`lineage` of the `context` is searched for the first matching
        `interface`. If it is a `string` the lineage and the lineage children
        are search for a `service` with this name.
        Defaults to :class:`adhocracy_core.interfaces.IPool`.
    """

    readonly = True
    default = deferred_get_post_pool
    missing = deferred_get_post_pool
    schema_type = ResourceObject
    iresource_or_service_name = IPool


@colander.deferred
def deferred_validate_references_post_pool(node: colander.SchemaNode,
                                           kw: dict) -> callable:
    """Validate the :term:`post_pool` for all reference children of `node`."""
    context = kw['context']
    reference_nodes = _get_reference_childs(node)
    validators = []
    for child in reference_nodes:
        _add_post_pool_validator(node, child, context, validators)
        _add_referenced_post_pool_validator(node, child, validators)
    return colander.All(*validators)


def _get_reference_childs(node):
    for child in node:
        if isinstance(child, PostPool):
            continue
        if isinstance(child, (Reference, References)):
            yield child


def _add_post_pool_validator(node, child, context, validators):
    post_pool = _get_post_pool_from_node(node, context)

    def validate_node(node, value):
        references = node.get_value(value, child.name)
        references = normalize_to_tuple(references)
        _validate_post_pool(child, references, post_pool)

    if post_pool is not None:
        validators.append(validate_node)


def _add_referenced_post_pool_validator(node, child, validators):
    referenced_isheet = child.reftype.getTaggedValue('target_isheet')

    def validate_node(node, value):
        references = node.get_value(value, child.name)
        references = normalize_to_tuple(references)
        for reference in references:
            sheet = get_sheet(reference, referenced_isheet)
            post_pool = _get_post_pool_from_node(sheet.schema, reference)
            _validate_post_pool(child, (reference,), post_pool)

    if referenced_isheet.isOrExtends(IPostPoolSheet):
        validators.append(validate_node)


def _get_post_pool_from_node(node, context):
    post_pool_nodes = [child for child in node if isinstance(child, PostPool)]
    for child in post_pool_nodes:
        type = child.iresource_or_service_name
        return _get_post_pool(context, type)


def _validate_post_pool(node, references: list, post_pool: IPool):
    post_pool_path = resource_path(post_pool)
    for reference in references:
        if reference.__parent__ is post_pool:
            continue
        msg = 'You can only add references inside {}'.format(post_pool_path)
        raise colander.Invalid(node, msg)


class PostPoolMappingSchema(colander.MappingSchema):

    """Check that the referenced nodes respect the :term:`post_pool`.

    To validate `references` (:class:`adhocracy_core.schems.Reference`) you
    need to add a :class:`adhocracy_core.schema.PostPool` node to this schema.
    To validate `backreferences` the referenced sheet needs to be a subtype
    of :class:`adhocracy_core.intefaces.IPostPoolSheet and the schema needs a
    a :class:`adhocracy_core.schema.PostPool` node.
    """

    validator = deferred_validate_references_post_pool


class Integer(AdhocracySchemaNode):

    """SchemaNode for Integer values.

    Example value: 1
    """

    schema_type = colander.Integer
    default = 0
    missing = colander.drop


class Rate(Integer):

    """SchemaNode for rate integer values.

    The following values are allowed:

      * 1: pro
      * 0: neutral
      * -1: contra
    """

    validator = colander.OneOf((1, 0, -1))
