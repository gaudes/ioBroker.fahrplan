"use strict";

// Umstellung auf ESM
/* 
const fStation = require("./station.js");
const fLine = require("./line.js");
*/
import fStation  from './station.js';
import fLine from './line.js';

// class fSection{
export default class fSection{
	constructor(helper){
		this.helper = helper;
		this.StationFrom = new fStation(helper);
		this.StationTo = new fStation(helper);
		this.Line = new fLine(helper);
		this.departure = null;
		this.departurePlanned = null;
		this.departureDelaySeconds = 0;
		this.departureDelayed = false;
		this.departureOnTime = false;
		this.arrival = null;
		this.arrivalPlanned = null;
		this.arrivalDelaySeconds = 0;
		this.arrivalDelayed = false;
		this.arrivalOnTime = false;
		this.json = "";
		this.reachable = true;
		this.walking = false;
	}

	/**
	* Writes Section information to ioBroker
	* @param {string} BasePath Path to channel with Section information
	*/
	async writeSection(BasePath){
		try {
			if (this.helper.Fahrplan.config.SaveObjects >= 2){
				await this.helper.SetChannel(`${BasePath}`, `Section ${this.StationFrom.name} - ${this.StationTo.name}`, `Section`);
				await this.helper.SetBoolState(`${BasePath}.Reachable`, "Reachable", "Reachable", this.reachable);
				// Station
				this.StationFrom.writeStation(`${BasePath}.StationFrom`, "StationFrom");
				this.StationTo.writeStation(`${BasePath}.StationTo`, "StationTo");
				// Departure Values
				await this.helper.SetNumState(`${BasePath}.Departure`, "Departure", "Departure", (new Date(this.departure)).getTime(), "date");
				await this.helper.SetNumState(`${BasePath}.DeparturePlanned`, "DeparturePlanned", "DeparturePlanned", (new Date(this.departurePlanned)).getTime(), "date");
				await this.helper.SetNumState(`${BasePath}.DepartureDelaySeconds`, "DepartureDelaySeconds", "DepartureDelaySeconds", this.departureDelaySeconds);
				await this.helper.SetBoolState(`${BasePath}.DepartureOnTime`, "DepartureOnTime", "DepartureOnTime", this.departureOnTime);
				await this.helper.SetBoolState(`${BasePath}.DepartureDelayed`, "DepartureDelayed", "DepartureDelayed", this.departureDelayed);
				// Arrival Values
				await this.helper.SetNumState(`${BasePath}.Arrival`, "Arrival", "Arrival", (new Date(this.arrival)).getTime(), "date");
				await this.helper.SetNumState(`${BasePath}.ArrivalPlanned`, "ArrivalPlanned", "ArrivalPlanned", (new Date(this.arrivalPlanned)).getTime(), "date");
				await this.helper.SetNumState(`${BasePath}.ArrivalDelaySeconds`, "ArrivalDelaySeconds", "ArrivalDelaySeconds", this.arrivalDelaySeconds);
				await this.helper.SetBoolState(`${BasePath}.ArrivalOnTime`, "ArrivalOnTime", "ArrivalOnTime", this.arrivalOnTime);
				await this.helper.SetBoolState(`${BasePath}.ArrivalDelayed`, "ArrivalDelayed", "ArrivalDelayed", this.arrivalDelayed);
				// Line Values
				this.Line.writeLine(`${BasePath}.Line`);
			}
		} catch(e) {
			this.helper.ReportingError(e, `Exception in Section`, "fSection", "writeSection", "", {json: this.json});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}
}
// Umstellung auf ESM
// module.exports = fSection;