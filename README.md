![Logo](admin/fahrplan.png)
# ioBroker.fahrplan

[![NPM version](http://img.shields.io/npm/v/iobroker.fahrplan.svg)](https://www.npmjs.com/package/iobroker.fahrplan)
[![Downloads](https://img.shields.io/npm/dm/iobroker.fahrplan.svg)](https://www.npmjs.com/package/iobroker.fahrplan)
![Number of Installations (latest)](http://iobroker.live/badges/fahrplan-installed.svg)
![Number of Installations (stable)](http://iobroker.live/badges/fahrplan-stable.svg)
[![Dependency Status](https://img.shields.io/david/gaudes/iobroker.fahrplan.svg)](https://david-dm.org/gaudes/iobroker.fahrplan)
[![Known Vulnerabilities](https://snyk.io/test/github/gaudes/ioBroker.fahrplan/badge.svg)](https://snyk.io/test/github/gaudes/ioBroker.fahrplan)
[![Build Status](https://travis-ci.com/gaudes/ioBroker.Fahrplan.svg?branch=master)](https://travis-ci.com/gaudes/ioBroker.Fahrplan)

[![NPM](https://nodei.co/npm/iobroker.fahrplan.png?downloads=true)](https://nodei.co/npm/iobroker.fahrplan/)

## Fahrplan Adapter für ioBroker

### Deutsch
Dieser Adapter für ioBroker verwendet HAFAS und speichert die Daten als Objekte in ioBroker.
Hierfür wird mobile API von HAFAS verwendet. HAFAS steht für HaCon Fahrplan-Auskunfts-System und wird von vielen europäischen Verkehrsunternehmen verwendet, unter anderem auch von der Deutschen Bahn.
Der Zugriff auf HAFAS erfolgt hierbei über [HAFAS-Client](https://github.com/public-transport/hafas-client).

Die gewünschten Routen müssen in der Adapterkonfiguration eingerichtet und aktiviert werden.
Über einen konfigurierbaren Intervall ruft der Adapter dann regelmäßig die Verbindungsinformationen ab.

### English
This adapter for ioBroker uses HAFAS and stores the data as states in ioBroker.
Therefor the mobile API of HAFAS is used. HAFAS is a public transport management system used by public transport providers across Europe, e.g. Deutsche Bahn.
[HAFAS-Client](https://github.com/public-transport/hafas-client) is used to access HAFAS.

The desired routes has to be configured and enabled in the adapter configuration.
The Adapter retrieves the connection information by a configured interval automatically.

## Konfiguration

### Deutsch

Die Start- und Zielorte sowie Zwischenziele müssen mit ihrer numerischen ID angegeben werden.
Eine Suchfunktion ist im Tab Einstellungen integriert.

#### Tab Einstellungen
| Einstellung                 | Beschreibung
|-----------------------------|---
| Anbieter                    |  Auswahl des zu verwendenden Anbieters, aktuell DB und ÖBB
| HTML-Ansicht erzeugen       |  Erzeugt pro Route eine kurze HTML-Tabelle in einem Objekt
| Aktualisierungsintervall    |  Intervall in dem die Route aktualisiert werden, Angabe in Minuten
| JSON-Elemente speichern     |  Die Rückgabe von HAFAS erfolgt als JSON, diese sollten zur Fehlerbehebung gespeichert werden

Auf der rechten Seite ist die Suchfunktion integriert. Zuerst muss ein Anbieter ausgewählt werden.
Danach kann über das Suchfeld und Drücken des Knopfs "Suche" nach einer Station gesucht werden.
Die Suchergebnisse der aktuellen Suche werden in der Tabelle angezeigt.

#### Tab Routen
Mit dem +-Button können neue Einträge zur Tabelle hinzugefügt werden.

| Einstellung                 | Beschreibung
|-----------------------------|---
| Nr                          | Die Nummer entspricht dem Unterknote in den Objekten und wird automatisch vergeben.
| Aktiv                       | Wenn die Route aktiviert ist werden die Verbindungsinfos aktualisiert
| Von                         | Numerische ID von Startbahnhof oder Starthaltestelle (Ermittlung über Suche)
| Nach                        | Numerische ID von Zielbahnhof oder Zielhaltestelle (Ermittlung über Suche)
| Via 1                       | Fahrt über bestimmten Ort angegeben als numerische ID (optional, sonst leer)
| Via 2                       | Fahrt über bestimmten Ort angegeben als numerische ID (optional, sonst leer)
| Verkehrsmittel              | Auswahl des Verkehrsmittels, z.B. Bus, S-Bahn, usw. Standardmäßig werden alle Verkehrsmittel ausgewählt
| Max. Umstiege               | Maximale Anzahl an Umstiegen. 0 für nur direkte Verbindungen.
| Fahrradmitnahme             | Nur Verbindungen mit Fahrradmitnahme auswählen

### English

Start and Desination and stopovers has to be identified with a numeric id.
Search function for theses IDs is integrated in Tab Settings.

#### Tab Settings
| Setting                     | Description
|-----------------------------|---
| Provider                    |  Selection of public transport provider, currently DB und ÖBB
| Create HTML view            |  Creates per route a simple HTML table in an object
| Update interval             |  Interval for updates of the routes in minutes
| Save JSON elements          |  Return from HAFAS is JSON, should be saved for troubleshooting

#### Tab Routes
With +-Button new entries can be added to the table.

| Setting                     | Description
|-----------------------------|---
| Nr                          | The number match the subnode in objects and is assigned automatically
| Activ                       | Connection information is updated when route is activ
| From                        | Numeric ID of start station oder start stop
| To                          | Numeric ID of destination station oder destination stop
| Via 1                       | Ride over special station as numeric ID (optional, empty per default)
| Via 2                       | Ride over special station as numeric ID (optional, empty per default)
| Vehicle                     | Selection of vehicle, e.g. Bus, S-Bahn, etc. Per default all vehicles are selected
| Max. transfers              | Maximum transfers on route, 0 for direct connections only
| Bycicle                     | Select only connections where bycicles allowed

## Changelog

### 0.1.0 (14.07.2020)
* (Gaudes) First public alpha release

### 0.0.2 (09.07.2020)
* (Gaudes) code enhancements (refactoring, correct names for variables)

### 0.0.1 (06.07.2020)
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
