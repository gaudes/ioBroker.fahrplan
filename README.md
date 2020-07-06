![Logo](admin/dbfahrplan.png)
# ioBroker.dbfahrplan

[![NPM version](http://img.shields.io/npm/v/iobroker.dbfahrplan.svg)](https://www.npmjs.com/package/iobroker.dbfahrplan)
[![Downloads](https://img.shields.io/npm/dm/iobroker.dbfahrplan.svg)](https://www.npmjs.com/package/iobroker.dbfahrplan)
![Number of Installations (latest)](http://iobroker.live/badges/dbfahrplan-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/dbfahrplan-stable.svg)
[![Dependency Status](https://img.shields.io/david/gaudes/iobroker.dbfahrplan.svg)](https://david-dm.org/gaudes/iobroker.dbfahrplan)
[![Known Vulnerabilities](https://snyk.io/test/github/gaudes/ioBroker.dbfahrplan/badge.svg)](https://snyk.io/test/github/gaudes/ioBroker.dbfahrplan)

[![NPM](https://nodei.co/npm/iobroker.dbfahrplan.png?downloads=true)](https://nodei.co/npm/iobroker.dbfahrplan/)

## DBFahrplan Adapter für ioBroker

### Deutsch
Dieser Adapter für ioBroker liest von der Webseite der Deutschen Bahn Verbindungen und speichert die Daten als Objekte in ioBroker.
Hierzu müssen die gewünschten Routen in der Adapterkonfiguration eingerichtet und aktiviert werden.
Über einen Zeitplan ruft der Adapter dann regelmäßig die Verbindungsinformationen ab.

### English
This adapter for ioBroker retrieves connections from the website of Deutsche Bahn and stores the data as states in ioBroker.
Therefor the desired routes has to be configured and enabled in the adapter configuration.
The Adapter retrieves the connection information by schedule automatically.

## Konfiguration

### Deutsch

### Tab Routen
Mit dem +-Button können neue Einträge zur Tabelle hinzugefügt werden.

| Einstellung                 | Beschreibung
|-----------------------------|---
| Nr                          | Die Nummer entspricht dem Unterknote in den Objekten und wird automatisch vergeben.
| Aktiv                       | Wenn die Route aktiviert ist werden die Verbindungsinfos aktualisiert
| Von                         | Startbahnhof oder Starthaltestelle
| Nach                        | Zielbahnhof oder Zielhaltestelle
| Via 1                       | Fahrt über bestimmten Ort (optional, sonst leer)
| Via 2                       | Fahrt über bestimmten Ort (optional, sonst leer)
| Verkehrsmittel              | Auswahl des Verkehrsmittels, z.B. Bus, S-Bahn, usw. Standardmäßig werden alle Verkehrsmittel ausgewählt
| Direktverbindung            | Nur Verbindungen ohne Umsteigen auswählen
| Fahrradmitnahme             | Nur Verbindungen mit Fahrradmitnahme auswählen


#### Tab Einstellungen
| Einstellung                 | Beschreibung
|-----------------------------|---
| HTML-Ansicht erzeugen       |  Erzeugt pro Route eine kurze HTML-Tabelle in einem Objekt

### English

### Tab Routes
With +-Button new entries can be added to the table.

| Setting                     | Description
|-----------------------------|---
| Nr                          | The number match the subnode in objects and is assigned automatically
| Activ                       | Connection information is updated when route is activ
| From                        | Start station oder start stop
| To                          | Destination station oder destination stop
| Via 1                       | Ride over special station (optional, empty per default)
| Via 2                       | Ride over special station (optional, empty per default)
| Vehicle                     | Selection of vehicle, e.g. Bus, S-Bahn, etc. Per default all vehicles are selected
| Direct connection           | Select only connections without transfer
| Bycicle                     | Select only connections where bycicles allowed

#### Tab Settings
| Setting                     | Description
|-----------------------------|---
| Create HTML view            |  Creates per route a simple HTML table in an object

## Tips

### Deutsch

#### Etwas funktioniert nicht ...
Zuerst sollte immer das Log in ioBroker geprüft werden.

Der häufigste Fehler ist, dass die Namen der Haltetellen nicht eindeutig sind. Im Log erscheint dann die Meldung, welche der Routen eine ungenaue Station hat, außerdem wird die generierte URL angezeigt. Diese kann man im Webbrowser aufrufen um sich die fehlerhafte Station sowie vorgeschlagene Stationen anzuschauen.
Falls es hierzu kommt muss man ausprobieren. Es hilft z.B. statt dem reinen Ort dann "Bahnhof, Ort" einzutragen.

Bei weiteren Fehlern sollte die Instanz des Adapters zuerst auf Log-Stufe "Debug" oder "Silly" eingestellt werden. Nun werden weitere Informationen protokolliert. Es werden auch die aus der Webseite der Deutschen Bahn extrahierten Informationen angezeigt. Diese sind zur Fehlerbehebung notwendig, müssen aber aufgrund der Länge meist direkt aus der tatsächlichen Log-Datei von ioBroker entnommen werden.

### English

#### Something went wrong ...
At first check the log in ioBroker.

Most common error is undefinite name of station. In the log is in these cases a message occuring, which route has a unspecific station. Also the generated URL is shown. This URL could be opened in Webbrowser to identify the faulty station name and to view suggested station names.
In these case some try-out is needed.

On other errors the log-level of the instance of the adapter should be set to "Debug" or "Silly". Now additional informations are logged. The extracted information from the website of Deutsche Bahn is also logged. For fixing these informations are required. Due to the length they have to be extracted in most cases directly from the log-file of ioBroker.

## Changelog

### 0.0.1 (24.06.2020)
* (Gaudes) initial release

## License
MIT License

Copyright (c) 2020 Ralf Gaudes <ralf@gaudes.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.