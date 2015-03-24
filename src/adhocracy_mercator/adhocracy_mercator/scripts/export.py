"""Export scripts for adhocracy_mercator."""

import csv
import inspect
import optparse
import os
import sys
import textwrap
import time

from pyramid.paster import bootstrap
from substanced.util import find_catalog

from adhocracy_core.catalog.adhocracy import index_rates
from adhocracy_core.sheets.metadata import IMetadata
from adhocracy_core.sheets.rate import ILikeable
from adhocracy_core.utils import get_sheet_field

from adhocracy_mercator.resources.mercator import IMercatorProposalVersion
from adhocracy_mercator.sheets.mercator import IFinance
from adhocracy_mercator.sheets.mercator import IMercatorSubResources
from adhocracy_mercator.sheets.mercator import IOrganizationInfo
from adhocracy_mercator.sheets.mercator import ITitle
from adhocracy_mercator.sheets.mercator import IUserInfo


def export_proposals():
    """Export all proposals from database and write them to csv file. """
    usage = 'usage: %prog config_file'
    parser = optparse.OptionParser(
        usage=usage,
        description=textwrap.dedent(inspect.getdoc(export_proposals))
    )
    options, args = parser.parse_args(sys.argv[1:])
    if not len(args) >= 1:
        print('You must provide at least one argument')
        return 2

    env = bootstrap(args[0])

    root = (env['root'])
    catalog = find_catalog(root, 'system')
    adhocracy_catalog = find_catalog(root, 'adhocracy')
    path = catalog['path']
    interfaces = catalog['interfaces']
    tag = adhocracy_catalog['tag']

    query = path.eq('/mercator') \
        & interfaces.eq(IMercatorProposalVersion) \
        & tag.eq('LAST')

    proposals = query.execute()

    if not os.path.exists('./var/export/'):
        os.makedirs('./var/export/')

    timestr = time.strftime('%Y%m%d-%H%M%S')

    filename = './var/export/MercatorProposalExport-%s.csv' % timestr
    result_file = open(filename, 'w', newline='')
    wr = csv.writer(result_file, delimiter=';', quotechar='"',
                    quoting=csv.QUOTE_MINIMAL)
    wr.writerow(['Title', 'Username', 'First name', 'Last name', 'Country',
                'Organisation', '# Rates', 'requested funding', 'budget'])

    for proposal in proposals:

        result = []

        # Title
        title = get_sheet_field(proposal, ITitle, 'title')
        result.append(title)

        # Username
        creator = get_sheet_field(proposal, IMetadata, 'creator')
        email = creator.email
        result.append(email)

        # First name
        first_name = get_sheet_field(proposal, IUserInfo, 'personal_name')
        result.append(first_name)

        # Last name
        last_name = get_sheet_field(proposal, IUserInfo, 'family_name')
        result.append(last_name)

        # Country
        country = get_sheet_field(proposal, IUserInfo, 'country')
        result.append(country)

        # Organisation
        organization_info = get_sheet_field(proposal,
                                            IMercatorSubResources,
                                            'organization_info')
        status = get_sheet_field(organization_info, IOrganizationInfo,
                                 'status')
        result.append(status)

        # Rates
        rates = get_sheet_field(proposal, ILikeable, 'post_pool')
        rates = index_rates(proposal, None)
        result.append(rates)

        # requested funding
        finance = get_sheet_field(proposal, IMercatorSubResources, 'finance')
        budget = get_sheet_field(finance, IFinance, 'budget')
        result.append(str(budget))
        requested_funding = get_sheet_field(finance, IFinance,
                                            'requested_funding')
        result.append(str(requested_funding))

        wr.writerow(result)

    env['closer']()
    print('Exported mercator proposals to %s' % filename)
