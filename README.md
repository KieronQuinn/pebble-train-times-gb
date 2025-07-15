# Pebble Train Times (GB)

Source code for a simple Pebble app built back in 2017 that displays train times for the National Rail network. 

Available on the [Rebble Store](https://store-beta.rebble.io/app/58bb064b6ca387c7de000d57).



Data provided by National Rail, using realtime information from the Live Departure Information boards; [example link](https://realtime.nationalrail.co.uk/ldbcis/departures.aspx?u=039B1CD1-14D4-4CB9-83B1-A84CC3AEDF83&crs=LAN&H=1080).

Station list from [UK Railway Stations](https://github.com/davwheat/uk-railway-stations) under the ODbL License



## Building

Since this is a pebble.js app, if you don't have a local version of CloudPebble, you must copy the files into a valid [pebble.js](https://github.com/pebble/pebblejs)) project, and then remove `"projectType": "pebblejs"` from `appinfo.json` to build it with the [Command Line Tools](https://hub.docker.com/r/bboehmke/pebble-dev).
