"use strict";

/*
 * Created with @iobroker/create-adapter v1.25.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");

class Fahrplan extends utils.Adapter {

	//#region Constructor
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "fahrplan",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}
	//#endregion

	//#region Default Function OnReady
	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		if (this.config.UpdateInterval){
			UpdateInterval = this.config.UpdateInterval;
		} 
		await new Promise(r => setTimeout(r, 2000));
		main();
	}
	//#endregion

	//#region onMessage
	/**
	* Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	* Using this method requires "common.message" property to be set to true in io-package.json
	* @param {ioBroker.Message} obj
	*/
    async onMessage(obj) {
        if (typeof obj === "object" && obj.message) {
            if (obj.command === "getStations") {
				let SearchResult = await getStation(obj.message.provider, obj.message.station);
                if (obj.callback) this.sendTo(obj.from, obj.command, SearchResult, obj.callback);
            }
        }
	}
	//#endregion

	//#region Default Function onUnload
	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			clearTimeout(updateRoutesTimeout);
			this.log.info("cleaned everything up...");
			callback();
		} catch (e) {
			callback();
		}
	}
	//#endregion
}

//#region Global Variables
const createClient = require('hafas-client');
const dbProfile = require('hafas-client/p/db');
const oebbProfile = require('hafas-client/p/oebb');
let client = null;
const adapter = new utils.Adapter('fahrplan');
let UpdateInterval = 5;
let updateRoutesTimeout = null;
let CounterRoutes = 0;
let CounterRoutesEnabled = 0;
let CounterRoutesDisabled = 0;
//#endregion

//#region Function MAIN
/**
 * Initializes timer event function for updates
 */
function main(){
	if (adapter.config.Provider === "DB") {	
		client = createClient(dbProfile, 'ioBroker.Fahrplan')
	} else if (adapter.config.Provider === "OEBB") {	
			client = createClient(oebbProfile, 'ioBroker.Fahrplan')
	} else{
		adapter.log.error("Unknown provider configured");
		adapter.terminate("Unknown provider configured")
	} 
	adapter.log.info("Adapter started, Updates every " + UpdateInterval + " minutes");
	updateRoutesTimer();
} 
//#endregion

//#region Function updateRoutesTimer
/**
 * Timer function running in configured interval
 */
function updateRoutesTimer(){
	updateRoutesTimeout && clearTimeout(updateRoutesTimeout);
	adapter.log.silly("Timer Event");
	// Checking Routes for Updates
	let RoutesConfig = adapter.config.routes||new Array(); 
	if (typeof RoutesConfig !== "undefined" && RoutesConfig.length > 0){
		adapter.log.debug("Routes defined, continuing");
		CounterRoutes = 0;
		CounterRoutesDisabled = 0;
		CounterRoutesEnabled = 0;
		for (let i in RoutesConfig) {
			getRoute(RoutesConfig[i], parseInt(i));
			CounterRoutes++;
		}
	}
	else
	{	 	
		adapter.log.info("No routes defined, adapter sleeping");
		// adapter.terminate("No routes defined");
	} 
	updateRoutesTimeout = setTimeout(updateRoutesTimer, parseInt(adapter.config.UpdateInterval) * 60 * 1000);
}
//#endregion

//#region Function getRoute
/**
* Gets Route information from Website and extracts connections
* @param {object} HRoute Single configuration entry for route
* @param {number} Index Index of the configuration entry
*/
async function getRoute(HRoute, Index) {
	try{ 
		if (HRoute.enabled == true){
			CounterRoutesEnabled++;
			adapter.log.debug("Route #" + Index.toString() + " from " + HRoute.station_from + " to " + HRoute.station_to + " running");
			// Getting Station_From details
			let StationFromResult = null;
			try{ 
				StationFromResult = await client.locations(HRoute.station_from);
				adapter.log.silly("Route #" + Index.toString() + " STATION_FROM: " + JSON.stringify(StationFromResult));
				if (StationFromResult.length === 1){
					await SetTextState(Index.toString() + ".StationFrom", "From station", "From station", StationFromResult[0].name);
					await SetTextState(Index.toString() + ".StationFrom.Name", "From station name", "From station name", StationFromResult[0].name);
					await SetTextState(Index.toString() + ".StationFrom.eBhf", "From station eBhf", "From station eBhf", StationFromResult[0].id);
					await SetTextState(Index.toString() + ".StationFrom.Type", "From station Type", "From station Type", StationFromResult[0]["type"]);
				} else{
					adapter.log.error("Multiple results found for station " + HRoute.station_from);
				}
			} catch (err){
				throw new Error("Station-From (Route #" + Index + ")" + err);
			} 
			// Getting Station_To details
			let StationToResult = null;
			try { 
				StationToResult = await client.locations(HRoute.station_to);
				adapter.log.silly("Route #" + Index.toString() + " STATION_TO: " + JSON.stringify(StationToResult));
				if (StationToResult.length === 1){
					await SetTextState(Index.toString() + ".StationTo", "To station", "To station", StationToResult[0].name);
					await SetTextState(Index.toString() + ".StationTo.Name", "To station name", "To station name", StationToResult[0].name);
					await SetTextState(Index.toString() + ".StationTo.eBhf", "To station eBhf", "To station eBhf", StationToResult[0].id);
					await SetTextState(Index.toString() + ".StationTo.Type", "To station Type", "To station Type", StationToResult[0]["type"]);
				} else{
					adapter.log.error("Multiple results found for station " + HRoute.station_to);
				} 
			} catch (err){
				throw new Error("Station-To (Route #" + Index + ")" + err);
			} 
			// Building Base-State for Connection, set Configuration State
			let HTMLShort = "";
			try{ 
				await SetBoolState(Index.toString() + ".Enabled", "Configuration State of Route #" + Index.toString(), "Route State from Adapter configuration", HRoute.enabled);
				await SetTextState(Index.toString(), "Route #" + Index.toString(), "Route from Adapter configuration", StationFromResult[0].name + " - " + StationToResult[0].name);
				if (adapter.config.SaveJSON !== false){
					await SetTextState(Index.toString() + ".StationFrom.JSON", "From station JSON", "From station JSON", JSON.stringify(StationFromResult[0]));
					await SetTextState(Index.toString() + ".StationTo.JSON", "To station JSON", "To station JSON", JSON.stringify(StationToResult[0]));
				} 
				HTMLShort = '<table><tr><th align="left" colspan="3">';
				HTMLShort = HTMLShort + StationFromResult[0].name + " - " + StationToResult[0].name;
				HTMLShort = HTMLShort + '</th></tr>'
			} catch (err){
				throw new Error("Base-States (Route #" + Index + ")" + err);
			} 
			// Searching route
			let RouteResult = null;
			try{ 
				let RouteOptions = { results: 3, language: "de" };
				if (HRoute.station_via !== "") RouteOptions["via"] = HRoute.station_via;
				if (HRoute.transfers >= 0) RouteOptions["transfers"] = HRoute.transfers;
				if (HRoute.bycicles === true) RouteOptions["bike"] = true;
				let TrainType = HRoute.traintype.toString().split(",");
				if (!(TrainType.indexOf('all') > -1)){
					let ProductOption = {}; 
					for (let i in TrainType){
						ProductOption[TrainType[i]] = true
					}
					RouteOptions["products"] = ProductOption;
				} 
				adapter.log.silly("Route #" + Index.toString() + " ROUTEOPTIONS: " + JSON.stringify(RouteOptions));
				RouteResult = await client.journeys(HRoute.station_from, HRoute.station_to, RouteOptions);
				if (adapter.config.SaveJSON !== false){
					await SetTextState(Index.toString() + ".JSON", "Route JSON", "Route JSON", JSON.stringify(RouteResult));
				} 
				adapter.log.silly("Route #" + Index.toString() + " ROUTE: " + JSON.stringify(RouteResult));
			} catch (err){
				throw new Error("Route-Search (Route #" + Index + ")" + err);
			} 
			// Saving Route to objects
			for (let i in RouteResult.journeys) {
				let Conn = RouteResult.journeys[i];
				adapter.log.silly("Route #" + Index.toString() + " Journey #" + i + ": " + JSON.stringify(Conn));
				// Count sections
				let CounterSection = 0;
				for (let j in Conn.legs ) {
					CounterSection++;
				}
				CounterSection--;
				let TransfersReachable = false;
				for (let j in Conn.legs ) {
					let ConnSub = Conn.legs[j];
					adapter.log.silly("Route #" + Index.toString() + " Journey #" + i + " Leg #" + j + ": " + JSON.stringify(ConnSub));
					if (adapter.config.SaveJSON !== false){
						await SetTextState(Index.toString() + "." + i + ".JSON", "Journey JSON", "Journey JSON", JSON.stringify(ConnSub));
					} 
					// Initialize Connection variables
					let ConnSumDelay = 0;
					try{ 
						// Save overall trainchanges
						await SetTextState(Index.toString() + "." + i + ".Changes", "Changes", "Changes", CounterSection.toString());
						// Save overall departure
						if (parseInt(j) === 0){
							await SetTextState(Index.toString() + "." + i, "Connection #" + i.toString(), "Connection", StationFromResult[0].name + " - " + StationToResult[0].name);
							await SetTextState(Index.toString() + "." + i + ".Departure", "Departure", "Departure", ConnSub.departure);
							await SetTextState(Index.toString() + "." + i + ".DeparturePlanned", "DeparturePlanned", "DeparturePlanned", ConnSub.plannedDeparture);
							await SetTextState(Index.toString() + "." + i + ".DepartureDelaySeconds", "DepartureDelaySeconds", "DepartureDelaySeconds", ConnSub.departureDelay);
							// Departure on time or delayed
							if (ConnSub.departureDelay === 0 && ConnSub.departureDelay < 60){
								await SetBoolState(Index.toString() + "." + i + ".DepartureOnTime", "DepartureOnTime", "DepartureOnTime", true);
								await SetBoolState(Index.toString() + "." + i + ".DepartureDelayed", "DepartureDelayed", "DepartureDelayed", false);
								HTMLShort = HTMLShort + '<tr><td><font color="green">' + adapter.formatDate(new Date(ConnSub.departure), "hh:mm") + '</font></td>';
							} else if (ConnSub.departureDelay > 60){
								await SetBoolState(Index.toString() + "." + i + ".DepartureOnTime", "DepartureOnTime", "DepartureOnTime", false);
								await SetBoolState(Index.toString() + "." + i + ".DepartureDelayed", "DepartureDelayed", "DepartureDelayed", true);
								HTMLShort = HTMLShort + '<tr><td><font color="red">' + adapter.formatDate(new Date(ConnSub.departure), "hh:mm") + '</font></td>';
							} else{
								await SetBoolState(Index.toString() + "." + i + ".DepartureOnTime", "DepartureOnTime", "DepartureOnTime", false);
								await SetBoolState(Index.toString() + "." + i + ".DepartureDelayed", "DepartureDelayed", "DepartureDelayed", false);
								HTMLShort = HTMLShort + '<tr><td>' + adapter.formatDate(new Date(ConnSub.departure), "hh:mm") + '</td>';
							}
						} 
					} catch (err){
						throw new Error("Journey-Overall1 (Route #" + Index + " Journey #" + i + " Section #" + j + ")" + err);
					} 
					// Save section information
					try{ 
						if (ConnSub.arrivalDelay > 0){
							ConnSumDelay = ConnSumDelay + ConnSub.arrivalDelay;
						}
						await SetTextState(Index.toString() + "." + i + "." + j, "Section #" + j.toString(), "Section", StationFromResult[0].name + " - " + StationToResult[0].name);
						await SetTextState(Index.toString() + "." + i + "." + j + ".StationFrom", "StationFrom", "StationFrom", ConnSub.origin.name);
						await SetTextState(Index.toString() + "." + i + "." + j + ".StationFrom.Name", "StationFromName", "StationFromName", ConnSub.origin.name);
						if (ConnSub["departurePlatform"]){ 
							await SetTextState(Index.toString() + "." + i + "." + j + ".StationFrom.Platform", "StationFromPlatform", "StationFromPlatform", ConnSub.departurePlatform);
						} else{
							await SetTextState(Index.toString() + "." + i + "." + j + ".StationFrom.Platform", "StationFromPlatform", "StationFromPlatform", "");
						} 
						if (ConnSub["plannedDeparturePlatform"]){
							await SetTextState(Index.toString() + "." + i + "." + j + ".StationFrom.PlatformPlanned", "StationFromPlatformPlanned", "StationFromPlatformPlanned", ConnSub.plannedDeparturePlatform);
						} else {
							await SetTextState(Index.toString() + "." + i + "." + j + ".StationFrom.PlatformPlanned", "StationFromPlatformPlanned", "StationFromPlatformPlanned", "");
						}
						await SetTextState(Index.toString() + "." + i + "." + j + ".StationTo", "StationTo", "StationTo", ConnSub.destination.name);
						await SetTextState(Index.toString() + "." + i + "." + j + ".StationTo.Name", "StationToName", "StationToName", ConnSub.destination.name);
						if (ConnSub["arrivalPlatform"]){
							await SetTextState(Index.toString() + "." + i + "." + j + ".StationTo.Platform", "StationToPlatform", "StationToPlatform", ConnSub.arrivalPlatform);
						} else {
							await SetTextState(Index.toString() + "." + i + "." + j + ".StationTo.Platform", "StationToPlatform", "StationToPlatform", "");
						}
						if (ConnSub["plannedArrivalPlatform"]){ 
							await SetTextState(Index.toString() + "." + i + "." + j + ".StationTo.PlatformPlanned", "StationToPlatformPlanned", "StationToPlatformPlanned", ConnSub.plannedArrivalPlatform);
						} else {
							await SetTextState(Index.toString() + "." + i + "." + j + ".StationTo.PlatformPlanned", "StationToPlatformPlanned", "StationToPlatformPlanned", "");
						}	
						await SetTextState(Index.toString() + "." + i + "." + j + ".Departure", "Departure", "Departure", ConnSub.departure);
						await SetTextState(Index.toString() + "." + i + "." + j + ".DeparturePlanned", "DeparturePlanned", "DeparturePlanned", ConnSub.plannedDeparture);
						await SetTextState(Index.toString() + "." + i + "." + j + ".DepartureDelaySeconds", "DepartureDelaySeconds", "DepartureDelaySeconds", ConnSub.departureDelay);
						if (ConnSub["reachable"] === true || ConnSub["reachable"] === false){ 
							await SetBoolState(Index.toString() + "." + i + "." + j + ".Reachable", "Reachable", "Reachable", ConnSub.reachable);
							if (ConnSub["reachable"] === true){
								TransfersReachable = true;
							} 
						} else {
							await deleteObject(Index.toString() + "." + i + "." + j + ".Reachable");
						}
						if (ConnSub["walking"]){ 
							await SetBoolState(Index.toString() + "." + i + "." + j + ".Walking", "Walking", "Walking", ConnSub.walking);
						} else {
							await deleteObject(Index.toString() + "." + i + "." + j + ".Walking");
						}
						if (ConnSub.departureDelay === 0 && ConnSub.departureDelay < 60){
							await SetBoolState(Index.toString() + "." + i + "." + j + ".DepartureOnTime", "DepartureOnTime", "DepartureOnTime", true);
							await SetBoolState(Index.toString() + "." + i + "." + j + ".DepartureDelayed", "DepartureDelayed", "DepartureDelayed", false);
						} else if (ConnSub.departureDelay >= 60){
							await SetBoolState(Index.toString() + "." + i + "." + j + ".DepartureOnTime", "DepartureOnTime", "DepartureOnTime", false);
							await SetBoolState(Index.toString() + "." + i + "." + j + ".DepartureDelayed", "DepartureDelayed", "DepartureDelayed", true);
						} else if (ConnSub.departureDelay === null) {
							await SetBoolState(Index.toString() + "." + i + "." + j + ".DepartureOnTime", "DepartureOnTime", "DepartureOnTime", false);
							await SetBoolState(Index.toString() + "." + i + "." + j + ".DepartureDelayed", "DepartureDelayed", "DepartureDelayed", false);
						}
						await SetTextState(Index.toString() + "." + i + "." + j + ".Arrival", "Arrival", "Arrival", ConnSub.arrival);
						await SetTextState(Index.toString() + "." + i + "." + j + ".ArrivalPlanned", "ArrivalPlanned", "ArrivalPlanned", ConnSub.plannedArrival);
						await SetTextState(Index.toString() + "." + i + "." + j + ".ArrivalDelaySeconds", "ArrivalDelaySeconds", "ArrivalDelaySeconds", ConnSub.arrivalDelay);
						if (ConnSub.arrivalDelay === 0 && ConnSub.arrivalDelay < 60){
							await SetBoolState(Index.toString() + "." + i + "." + j + ".ArrivalOnTime", "ArrivalOnTime", "ArrivalOnTime", true);
							await SetBoolState(Index.toString() + "." + i + "." + j + ".ArrivalDelayed", "ArrivalDelayed", "ArrivalDelayed", false);
						} else if (ConnSub.arrivalDelay >= 60){
							await SetBoolState(Index.toString() + "." + i + "." + j + ".ArrivalOnTime", "ArrivalOnTime", "ArrivalOnTime", false);
							await SetBoolState(Index.toString() + "." + i + "." + j + ".ArrivalDelayed", "ArrivalDelayed", "ArrivalDelayed", true);
						} else if (ConnSub.arrivalDelay === null) {
							await SetBoolState(Index.toString() + "." + i + "." + j + ".ArrivalOnTime", "ArrivalOnTime", "ArrivalOnTime", false);
							await SetBoolState(Index.toString() + "." + i + "." + j + ".ArrivalDelayed", "ArrivalDelayed", "ArrivalDelayed", false);
						}
					} catch (err){
						throw new Error("Journey-Section (Route #" + Index + " Journey #" + i + " Section #" + j + ")" + err);
					} 
					// Line information
					try{ 
						if (ConnSub["line"]){ 
							await SetTextState(Index.toString() + "." + i + "." + j + ".Line", "Line", "Line", ConnSub.line.name);
							await SetTextState(Index.toString() + "." + i + "." + j + ".Line.Name", "Line Name", "Line Name", ConnSub.line.name);
							await SetTextState(Index.toString() + "." + i + "." + j + ".Line.Mode", "Line Mode", "Line Mode", ConnSub.line.mode);
							await SetTextState(Index.toString() + "." + i + "." + j + ".Line.Product", "Line Product", "Line Product", ConnSub.line.product);
							if (ConnSub.line["operator"]){ 
								await SetTextState(Index.toString() + "." + i + "." + j + ".Line.Operator", "Line Operator", "Line Operator", ConnSub.line.operator.name);
							} else{
								await SetTextState(Index.toString() + "." + i + "." + j + ".Line.Operator", "Line Operator", "Line Operator", "");
							} 	
							await SetTextState(Index.toString() + "." + i + "." + j + ".Line.Direction", "Line Direction", "Line Direction", ConnSub.direction);
						} else{
							await deleteObject(Index.toString() + "." + i + "." + j + ".Line.Name");
							await deleteObject(Index.toString() + "." + i + "." + j + ".Line.Mode");
							await deleteObject(Index.toString() + "." + i + "." + j + ".Line.Product");
							await deleteObject(Index.toString() + "." + i + "." + j + ".Line.Operator");
							await deleteObject(Index.toString() + "." + i + "." + j + ".Line.Direction");
							await deleteObject(Index.toString() + "." + i + "." + j + ".Line");
						} 
					} catch (err){
						throw new Error("Journey-Line (Route #" + Index + " Journey #" + i + " Section #" + j + ")" + err);
					} 	
					// Save overall arrival and final objects
					try{ 
						if (parseInt(j) === CounterSection){
							await SetTextState(Index.toString() + "." + i + ".Arrival", "Arrival", "Arrival", ConnSub.arrival);
							await SetTextState(Index.toString() + "." + i + ".ArrivalPlanned", "ArrivalPlanned", "ArrivalPlanned", ConnSub.plannedArrival);
							await SetTextState(Index.toString() + "." + i + ".ArrivalDelaySeconds", "ArrivalDelaySeconds", "ArrivalDelaySeconds", ConnSub.arrivalDelay);
							// Arrival on time or delayed
							if (ConnSub.arrivalDelay === 0 && ConnSub.arrivalDelay < 60){
								await SetBoolState(Index.toString() + "." + i + ".ArrivalOnTime", "ArrivalOnTime", "ArrivalOnTime", true);
								await SetBoolState(Index.toString() + "." + i + ".ArrivalDelayed", "ArrivalDelayed", "ArrivalDelayed", false);
								HTMLShort = HTMLShort + '<td><font color="green">' + adapter.formatDate(new Date(ConnSub.arrival), "hh:mm") + '</font></td></tr>';
							} else if (ConnSub.arrivalDelay > 60){
								await SetBoolState(Index.toString() + "." + i + ".ArrivalOnTime", "ArrivalOnTime", "ArrivalOnTime", false);
								await SetBoolState(Index.toString() + "." + i + ".ArrivalDelayed", "ArrivalDelayed", "ArrivalDelayed", true);
								HTMLShort = HTMLShort + '<td><font color="red">' + adapter.formatDate(new Date(ConnSub.arrival), "hh:mm") + '</font></td></tr>';
							} else{
								await SetBoolState(Index.toString() + "." + i + ".ArrivalOnTime", "ArrivalOnTime", "ArrivalOnTime", false);
								await SetBoolState(Index.toString() + "." + i + ".ArrivalDelayed", "ArrivalDelayed", "ArrivalDelayed", false);
								HTMLShort = HTMLShort + '<td>' + adapter.formatDate(new Date(ConnSub.arrival), "hh:mm") + '</td></tr>';
							}
							// Final objects
							await SetBoolState(Index.toString() + "." + i + ".TransfersReachable", "TransfersReachable", "TransfersReachable", TransfersReachable);
							await deleteUnusedSections(Index, parseInt(i), CounterSection);
						} 
					} catch (err){
						throw new Error("Journey-Overall2 (Route #" + Index + " Journey #" + i + " Section #" + j + ")" + err);
					} 	
				}	
			}
			HTMLShort = HTMLShort + "</table>"
			if (adapter.config.CreateHTML === "true"){
				adapter.log.debug("HTML: " + HTMLShort);
				await SetTextState(Index.toString() + ".HTML", "HTML", "HTML", HTMLShort);
			} else{
				await deleteObject(Index.toString() + ".HTML");
			} 
			await deleteUnusedConnections(Index, 2);
		} else {
			try{ 
				CounterRoutesDisabled++;
				await deleteConnections(Index)
				adapter.log.debug("Route #" + Index.toString() + " from " + HRoute.station_from + " to " + HRoute.station_to + " disabled");
				await SetBoolState(Index.toString() + ".Enabled", "Configuration State of Route #" + Index.toString(), "Route State from Adapter configuration", false)
			} catch (err){
				throw new Error("Route-Disabled (Route #" + Index + ")" + err);
			} 	
		}
	} catch(e){
		adapter.log.error("Exception in getRoute [" + e + "]");
	}
}
//#endregion

//#region Helper Function getStation
/**
 * Helper function for StationSearch in Admin
 * @param {string} Provider Configured provider in Admin
 * @param {string} SearchString Searchstring entered in Admin
 */
async function getStation(Provider, SearchString){
	adapter.log.silly("Search: Provider = " + Provider + " SearchString = " + SearchString);
	/*let client = null;
	if (Provider === "DB") {	
		client = createClient(dbProfile, 'ioBroker.DBFahrplan')
	} else{
		return null;
	} */
	const msg = await client.locations(SearchString, {results: 10});
	adapter.log.silly("STATION: " + JSON.stringify(msg));
	return msg;
} 
//#endregion

//#region Helper Function SetTextState
/**
* Sets Text State
* @param {string} StateName Name of the State
* @param {string} DisplayName Displayed Name of the State
* @param {string} Description Description of the State
* @param {string} Value Value of the State
*/
async function SetTextState(StateName, DisplayName, Description, Value){
	try{ 
		await adapter.setObjectAsync(StateName, {
			type: "state",
			common: {
				name: DisplayName,
				type: "string",
				role: "state",
				read: true,
				write: false,
				desc: Description
			},
			native: {},
		});	
		await adapter.setStateAsync(StateName, { val: Value, ack: true });
		return true;
	}catch(e){
		adapter.log.error("Exception in SetTextState [" + e + "]");
		throw "Exception in SetTextState [" + e + "]";
	} 	
} 
//#endregion

//#region Helper Function SetBoolState
/**
* Sets boolean State
* @param {string} StateName Name of the State
* @param {string} DisplayName Displayed Name of the State
* @param {string} Description Description of the State
* @param {boolean} Value Value of the State
*/
async function SetBoolState(StateName, DisplayName, Description, Value){
		try{ 
		await adapter.setObjectAsync(StateName, {
			type: "state",
			common: {
				name: DisplayName,
				type: "boolean",
				role: "state",
				read: true,
				write: false,
				desc: Description
			},
			native: {},
		});	
		await adapter.setStateAsync(StateName, { val: Value, ack: true });
		return true;
	} catch (e){
		adapter.log.error("Exception in SetBoolState [" + e + "]");
		throw "Exception in SetBoolState [" + e + "]";
	} 	
}
//#endregion

//#region Helper Function deleteObject
/**
* Sets boolean State
* @param {string} StateName Name of the State
*/
async function deleteObject(StateName){
	try{ 
		let State = await adapter.getStateAsync(StateName);
		if (State !== null){
			adapter.delObject(StateName);
		} 
	}catch(err){
		adapter.log.error(err);
	}
} 
//#endregion

//#region Helper Function deleteConnections
/**
* Sets boolean State
* @param {Number} Route Number of Route from configuration
*/
async function deleteConnections(Route){
	try{ 
		let States = await adapter.getStatesOfAsync(Route.toString());
		for (let State of States){
			if (State["_id"] !== adapter.name + "." + adapter.instance + "." + Route + ".Enabled") { 
				await adapter.delObjectAsync(State["_id"]);
			}	
		} 
	}catch(err){
		adapter.log.error(err);
	}
} 
//#endregion

//#region Helper Function deleteUnusedSections
/**
* Sets boolean State
* @param {Number} Route Number of Route from configuration
* @param {Number} Connection Number of Connection
* @param {Number} Sections Number of Sections in Connection
*/
async function deleteUnusedSections(Route, Connection, Sections){
	try{ 
		let States = await adapter.getStatesAsync(Route.toString() + "." + Connection.toString() + ".*");
		let SectionRegEx = adapter.name + "." + adapter.instance + "." + Route.toString() + "." + Connection.toString() + ".(\\d*).*$";
		adapter.log.silly("DELETE Route #" + Route + " Connection #" + Connection + " with max section # " + Sections + " and regex:" + SectionRegEx);	
		for (let State in States){
			let Searcher = State.toString().match(new RegExp(SectionRegEx));
			if (Searcher !== null){ 
				if (parseInt(Searcher[1]) > Sections ){
					//adapter.log.error(State);
					await adapter.delObjectAsync(State);
				}
			}	
		} 
	}catch(err){
		adapter.log.error(err);
	}
} 
//#endregion

//#region Helper Function deleteUnusedConnections
/**
* Sets boolean State
* @param {Number} Route Number of Route from configuration
* @param {Number} Connections Number of Connections in Route
*/
async function deleteUnusedConnections(Route, Connections){
	try{ 
		let States = await adapter.getStatesAsync(Route.toString() + ".*");
		let SectionRegEx = adapter.name + "." + adapter.instance + "." + Route.toString() + ".(\\d*).*$";
		adapter.log.silly("DELETE Route #" + Route + " with max Connection #" + Connections + " and regex:" + SectionRegEx);	
		for (let State in States){
			let Searcher = State.toString().match(new RegExp(SectionRegEx));
			if (Searcher !== null){ 
				if (parseInt(Searcher[1]) > Connections ){
					//adapter.log.error(State);
					await adapter.delObjectAsync(State);
				}
			}	
		} 
	}catch(err){
		adapter.log.error(err);
	}
} 
//#endregion

//#region Default
// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Fahrplan(options);
} else {
	// otherwise start the instance directly
	new Fahrplan();
}
//#endregion