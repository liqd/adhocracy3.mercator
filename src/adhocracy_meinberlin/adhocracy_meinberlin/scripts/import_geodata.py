"""Import GEO-Data to meinBerlin.

The functions are registered in setup.py
in setup.py.
"""


import sys
import os
import json


def import_bezirksregions():
    """Get geodata for berlin's bezirksregions from FIS-Broker."""
    call = 'ogr2ogr -s_srs EPSG:25833 -t_srs WGS84 -f geoJSON ' \
           '/tmp/bezirksregions.json WFS:"http://fbinter.stadt-berlin.de' \
           '/fb/wfs/geometry/senstadt/re_bezirksregion?TYPENAMES=GML2" ' \
           ' fis:re_bezirksregion'

    try:
        os.remove('/tmp/bezirksregions.json')
        print('Old file removed')
    except:
        print('No file to remove')

    try:
        os.system(call)
    except Exception:
        t, e = sys.exc_info()[:2]
        print(e)

    data = json.load(open('/tmp/bezirksregions.json', 'r'))

    for feature in data['features']:

        geometry = feature['geometry']['coordinates']

        bezirk = feature['properties']['BEZIRK']
        bezirks_region_name = feature['properties']['BZR_NAME']

        print(bezirk)
        print(bezirks_region_name)
        print(geometry)


def import_bezirke():
    """Get geodata for berlin's bezirke from FIS-Broker."""
    call = 'ogr2ogr -s_srs EPSG:25833 -t_srs WGS84 -f geoJSON ' \
           ' /tmp/bezirke.json WFS:"http://fbinter.stadt-berlin.de' \
           '/fb/wfs/geometry/senstadt/re_bezirke?TYPENAMES=GML2"' \
           'fis:re_bezirke'

    try:
        os.remove('/tmp/bezirke.json')
        print('Old file removed')
    except:
        print('No file to remove')

    try:
        os.system(call)
    except Exception:
        t, e = sys.exc_info()[:2]
        print(e)

    data = json.load(open('/tmp/bezirke.json', 'r'))

    for feature in data['features']:

        geometry = feature['geometry']['coordinates']
        bezirk = feature['properties']['spatial_alias']

        print(bezirk)
        print(geometry)
