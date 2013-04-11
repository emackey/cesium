import urllib2
import json
import os
import csv
import time

if __name__ == "__main__":
    fin = open("nations.json", "r")
    countriesJson = json.load(fin)
    fin.close()

    for country in countriesJson:
        #print country["name"]
        url = 'http://nominatim.openstreetmap.org/search?format=json&country=%s' % (country["name"])
        url = url.replace(" ", "%20")
        response = json.loads(urllib2.urlopen(url).read())

        if len(response) == 0:
            url = 'http://nominatim.openstreetmap.org/search?format=json&q=%s' % (country["name"])
            url = url.replace(" ", "%20")
            response = json.loads(urllib2.urlopen(url).read())

            if len(response) == 0:
                print country["name"]
                continue

        country["lat"] = float(response[0]["lat"])
        country["lon"] = float(response[0]["lon"])

    fout = open('nations_geo.json', 'w')
    json.dump(countriesJson, fout)
    fout.close()
    