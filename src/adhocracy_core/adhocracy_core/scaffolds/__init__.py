"""Create scaffolds to customize or extend adhocracy."""
from pyramid.scaffolds import PyramidTemplate
import random
import string


class AdhocracyExtensionTemplate(PyramidTemplate):

    """Basic python egg that extends adhocracy."""

    _template_dir = 'adhocracy'
    summary = 'Adocracy extension app'

    def pre(self, command, output_dir, vars):  # pragma: no cover
        """Create example extension package."""
        size = 10
        chars = string.ascii_letters + string.digits
        vars['random_password'] = ''.join(
            random.choice(chars) for x in range(size)
        )
        return PyramidTemplate.pre(self, command, output_dir, vars)
