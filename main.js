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
			iUpdateInterval = this.config.UpdateInterval;
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
				// @ts-ignore Provider and message always in message
				let jSearchResult = await getStation(obj.message.provider, obj.message.station);
                if (obj.callback) this.sendTo(obj.from, obj.command, jSearchResult, obj.callback);
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
			clearTimeout(tUpdateRoutesTimeout);
			this.log.info("cleaned everything up...");
			callback();
		} catch (e) {
			callback();
		}
	}
	//#endregion
}

//#region Global Variables
const hCreateClient = require('hafas-client');
const hDBprofile = require('hafas-client/p/db');
const hOEBBprofile = require('hafas-client/p/oebb');
let hClient = null;
const adapter = new utils.Adapter('fahrplan');
let iUpdateInterval = 5;
let tUpdateRoutesTimeout = null;
let iCounterRoutes = 0;
let iCounterRoutesEnabled = 0;
let iCounterRoutesDisabled = 0;
//#endregion

//#region Function MAIN
/**
 * Initializes timer event function for updates
 */
function main(){
	if (adapter.config.Provider === "DB") {	
		hClient = hCreateClient(hDBprofile, 'ioBroker.Fahrplan')
	} else if (adapter.config.Provider === "OEBB") {	
			hClient = hCreateClient(hOEBBprofile, 'ioBroker.Fahrplan')
	} else{
		adapter.log.error("Unknown provider configured");
		adapter.terminate("Unknown provider configured")
	} 
	adapter.log.info(`Adapter started, Updates every ${iUpdateInterval} minutes`);
	updateRoutesTimer();
} 
//#endregion

//#region Function updateRoutesTimer
/**
 * Timer function running in configured interval
 */
function updateRoutesTimer(){
	tUpdateRoutesTimeout && clearTimeout(tUpdateRoutesTimeout);
	adapter.log.silly("Timer Event");
	// Checking Routes for Updates
	let aRoutesConfig = adapter.config.routes || new Array(); 
	if (typeof aRoutesConfig !== "undefined" && aRoutesConfig.length > 0){
		adapter.log.debug("Routes defined, continuing");
		iCounterRoutes = 0;
		iCounterRoutesDisabled = 0;
		iCounterRoutesEnabled = 0;
		for (let iRouteConfigCurrent in aRoutesConfig) {
			getRoute(aRoutesConfig[iRouteConfigCurrent], parseInt(iRouteConfigCurrent));
			iCounterRoutes++;
		}
		adapter.log.info(`Updated ${iCounterRoutes} routes, ${iCounterRoutesEnabled} enabled and ${iCounterRoutesDisabled} disabled`);
	}
	else
	{	 	
		adapter.log.info("No routes defined, adapter sleeping");
		// adapter.terminate("No routes defined");
	} 
	tUpdateRoutesTimeout = setTimeout(updateRoutesTimer, adapter.config.UpdateInterval * 60 * 1000);
}
//#endregion

//#region Function getRoute
/**
* Gets Route information from Website and extracts connections
* @param {object} oRoute Single configuration entry for route
* @param {number} iRouteIndex Index of the configuration entry
*/
async function getRoute(oRoute, iRouteIndex) {
	try{ 
		if (oRoute.enabled == true){
			iCounterRoutesEnabled++;
			adapter.log.debug(`Route #${iRouteIndex.toString()} from ${oRoute.station_from} to ${oRoute.station_to} running`);
			// Getting Station_From details
			let aStationFromResult = null;
			try{ 
				aStationFromResult = await hClient.locations(oRoute.station_from);
				adapter.log.silly(`Route #${iRouteIndex.toString()} STATION_FROM: ${JSON.stringify(aStationFromResult)}`);
				if (aStationFromResult.length === 1){
					await SetChannel(`${iRouteIndex.toString()}.StationFrom`, aStationFromResult[0].name, "From station");
					await SetTextState(`${iRouteIndex.toString()}.StationFrom.Name`, "From station name", "From station name", aStationFromResult[0].name);
					await SetTextState(`${iRouteIndex.toString()}.StationFrom.eBhf`, "From station eBhf", "From station eBhf", aStationFromResult[0].id);
					await SetTextState(`${iRouteIndex.toString()}.StationFrom.Type`, "From station Type", "From station Type", aStationFromResult[0]["type"]);
				} else{
					adapter.log.error(`Multiple results found for station ${oRoute.station_from}`);
				}
			} catch (err){
				throw new Error(`Station-From (Route #${iRouteIndex})${err}`);
			} 
			// Getting Station_To details
			let aStationToResult = null;
			try { 
				aStationToResult = await hClient.locations(oRoute.station_to);
				adapter.log.silly(`Route #${iRouteIndex.toString()} STATION_TO: ${JSON.stringify(aStationToResult)}`);
				if (aStationToResult.length === 1){
					await SetChannel(`${iRouteIndex.toString()}.StationTo`, aStationToResult[0].name, "To station");
					await SetTextState(`${iRouteIndex.toString()}.StationTo.Name`, "To station name", "To station name", aStationToResult[0].name);
					await SetTextState(`${iRouteIndex.toString()}.StationTo.eBhf`, "To station eBhf", "To station eBhf", aStationToResult[0].id);
					await SetTextState(`${iRouteIndex.toString()}.StationTo.Type`, "To station Type", "To station Type", aStationToResult[0]["type"]);
				} else{
					adapter.log.error(`Multiple results found for station ${oRoute.station_to}`);
				} 
			} catch (err){
				throw new Error(`Station-To (Route #${iRouteIndex})${err}`);
			} 
			// Building Base-State for Connection, set Configuration State
			let sHTMLShort = "";
			try{ 
				await SetBoolState(`${iRouteIndex.toString()}.Enabled`, `Configuration State of Route #${iRouteIndex.toString()}`, "Route State from Adapter configuration", oRoute.enabled);
				await SetChannel(iRouteIndex.toString(), `Route #${iRouteIndex.toString()} - ${aStationFromResult[0].name} - ${aStationToResult[0].name}`, "Route from Adapter configuration");
				if (adapter.config.SaveJSON !== false){
					await SetTextState(`${iRouteIndex.toString()}.StationFrom.JSON`, "From station JSON", "From station JSON", JSON.stringify(aStationFromResult[0]));
					await SetTextState(`${iRouteIndex.toString()}.StationTo.JSON`, "To station JSON", "To station JSON", JSON.stringify(aStationToResult[0]));
				} 
				sHTMLShort = '<table><tr><th align="left" colspan="3">';
				sHTMLShort = `${sHTMLShort}${aStationFromResult[0].name} - ${aStationToResult[0].name}`;
				sHTMLShort = `${sHTMLShort}</th></tr>`
			} catch (err){
				throw new Error(`Base-States (Route #${iRouteIndex})${err}`);
			} 
			// Searching route
			let aRouteResult = null;
			try{ 
				let aRouteOptions = { results: 3, language: "de", remarks: true };
				if (oRoute.station_via !== "") aRouteOptions["via"] = oRoute.station_via;
				if (oRoute.transfers >= 0) aRouteOptions["transfers"] = oRoute.transfers;
				if (oRoute.bycicles === true) aRouteOptions["bike"] = true;
				let aTrainType = oRoute.traintype.toString().split(",");
				if (!(aTrainType.indexOf('all') > -1)){
					let aProductOption = {}; 
					for (let i in aTrainType){
						aProductOption[aTrainType[i]] = true
					}
					aRouteOptions["products"] = aProductOption;
				} 
				adapter.log.silly(`Route #${iRouteIndex.toString()} ROUTEOPTIONS: ${JSON.stringify(aRouteOptions)}`);
				aRouteResult = await hClient.journeys(oRoute.station_from, oRoute.station_to, aRouteOptions);
				if (adapter.config.SaveJSON !== false){
					await SetTextState(`${iRouteIndex.toString()}.JSON`, "Route JSON", "Route JSON", JSON.stringify(aRouteResult));
				} 
				adapter.log.silly(`Route #${iRouteIndex.toString()} ROUTE: ${JSON.stringify(aRouteResult)}`);
			} catch (err){
				throw new Error(`Route-Search (Route #${iRouteIndex})${err}`);
			} 
			// Saving Route to objects
			for (let iJourneysCurrent in aRouteResult.journeys) {
				let aConn = aRouteResult.journeys[iJourneysCurrent];
				adapter.log.silly(`Route #${iRouteIndex.toString()} Journey #${iJourneysCurrent}: ${JSON.stringify(aConn)}`);
				// Count sections
				let iCounterSection = 0;
				for (let iSectionCurrent in aConn.legs ) {
					iCounterSection++;
				}
				iCounterSection--;
				let bTransfersReachable = false;
				for (let j in aConn.legs ) {
					let aConnSub = aConn.legs[j];
					adapter.log.silly(`Route #${iRouteIndex.toString()} Journey #${iJourneysCurrent} Leg #${j}: ${JSON.stringify(aConnSub)}`);
					if (adapter.config.SaveJSON !== false){
						await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.JSON`, "Journey JSON", "Journey JSON", JSON.stringify(aConnSub));
					} 
					// Initialize Connection variables
					let iConnSumDelay = 0;
					try{ 
						// Save overall trainchanges
						await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.Changes`, "Changes", "Changes", iCounterSection.toString());
						// Save overall departure
						if (parseInt(j) === 0){
							await SetChannel(`${iRouteIndex.toString()}.${iJourneysCurrent}`, `Connection #${iJourneysCurrent.toString()} ${aStationFromResult[0].name} - ${aStationToResult[0].name}`, "Connection");
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.Departure`, "Departure", "Departure", aConnSub.departure);
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.DeparturePlanned`, "DeparturePlanned", "DeparturePlanned", aConnSub.plannedDeparture);
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.DepartureDelaySeconds`, "DepartureDelaySeconds", "DepartureDelaySeconds", aConnSub.departureDelay);
							// Departure on time or delayed
							if (aConnSub.departureDelay === 0 && aConnSub.departureDelay < 60){
								await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.DepartureOnTime`, "DepartureOnTime", "DepartureOnTime", true);
								await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.DepartureDelayed`, "DepartureDelayed", "DepartureDelayed", false);
								sHTMLShort = `${sHTMLShort}<tr><td><font color="green">${adapter.formatDate(new Date(aConnSub.departure), "hh:mm")}</font></td>`;
							} else if (aConnSub.departureDelay > 60){
								await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.DepartureOnTime`, "DepartureOnTime", "DepartureOnTime", false);
								await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.DepartureDelayed`, "DepartureDelayed", "DepartureDelayed", true);
								sHTMLShort = `${sHTMLShort}<tr><td><font color="red">${adapter.formatDate(new Date(aConnSub.departure), "hh:mm")}</font></td>`;
							} else{
								await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.DepartureOnTime`, "DepartureOnTime", "DepartureOnTime", false);
								await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.DepartureDelayed`, "DepartureDelayed", "DepartureDelayed", false);
								sHTMLShort = `${sHTMLShort}<tr><td>${adapter.formatDate(new Date(aConnSub.departure), "hh:mm")}</td>`;
							}
						} 
					} catch (err){
						throw new Error(`Journey-Overall1 (Route #${iRouteIndex} Journey #${iJourneysCurrent} Section #${j})${err}`);
					} 
					// Save section information
					try{ 
						if (aConnSub.arrivalDelay > 0){
							iConnSumDelay = iConnSumDelay + aConnSub.arrivalDelay;
						}
						await SetChannel(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}`, `Section #${j.toString()} ${aStationFromResult[0].name} - ${aStationToResult[0].name}`, "Section");
						await SetChannel(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.StationFrom`, aConnSub.origin.name, "StationFrom");
						await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.StationFrom.Name`, "StationFromName", "StationFromName", aConnSub.origin.name);
						if (aConnSub["departurePlatform"]){ 
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.StationFrom.Platform`, "StationFromPlatform", "StationFromPlatform", aConnSub.departurePlatform);
						} else{
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.StationFrom.Platform`, "StationFromPlatform", "StationFromPlatform", "");
						} 
						if (aConnSub["plannedDeparturePlatform"]){
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.StationFrom.PlatformPlanned`, "StationFromPlatformPlanned", "StationFromPlatformPlanned", aConnSub.plannedDeparturePlatform);
						} else {
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.StationFrom.PlatformPlanned`, "StationFromPlatformPlanned", "StationFromPlatformPlanned", "");
						}
						await SetChannel(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.StationTo`, aConnSub.destination.name, "StationTo");
						await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.StationTo.Name`, "StationToName", "StationToName", aConnSub.destination.name);
						if (aConnSub["arrivalPlatform"]){
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.StationTo.Platform`, "StationToPlatform", "StationToPlatform", aConnSub.arrivalPlatform);
						} else {
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.StationTo.Platform`, "StationToPlatform", "StationToPlatform", "");
						}
						if (aConnSub["plannedArrivalPlatform"]){ 
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.StationTo.PlatformPlanned`, "StationToPlatformPlanned", "StationToPlatformPlanned", aConnSub.plannedArrivalPlatform);
						} else {
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.StationTo.PlatformPlanned`, "StationToPlatformPlanned", "StationToPlatformPlanned", "");
						}	
						await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Departure`, "Departure", "Departure", aConnSub.departure);
						await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.DeparturePlanned`, "DeparturePlanned", "DeparturePlanned", aConnSub.plannedDeparture);
						await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.DepartureDelaySeconds`, "DepartureDelaySeconds", "DepartureDelaySeconds", aConnSub.departureDelay);
						if (aConnSub["reachable"] === true || aConnSub["reachable"] === false){ 
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Reachable`, "Reachable", "Reachable", aConnSub.reachable);
							if (aConnSub["reachable"] === true){
								bTransfersReachable = true;
							} 
						} else {
							await deleteObject(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Reachable`);
						}
						if (aConnSub["walking"]){ 
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Walking`, "Walking", "Walking", aConnSub.walking);
						} else {
							await deleteObject(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Walking`);
						}
						if (aConnSub.departureDelay === 0 && aConnSub.departureDelay < 60){
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.DepartureOnTime`, "DepartureOnTime", "DepartureOnTime", true);
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.DepartureDelayed`, "DepartureDelayed", "DepartureDelayed", false);
						} else if (aConnSub.departureDelay >= 60){
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.DepartureOnTime`, "DepartureOnTime", "DepartureOnTime", false);
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.DepartureDelayed`, "DepartureDelayed", "DepartureDelayed", true);
						} else if (aConnSub.departureDelay === null) {
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.DepartureOnTime`, "DepartureOnTime", "DepartureOnTime", false);
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.DepartureDelayed`, "DepartureDelayed", "DepartureDelayed", false);
						}
						await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Arrival`, "Arrival", "Arrival", aConnSub.arrival);
						await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.ArrivalPlanned`, "ArrivalPlanned", "ArrivalPlanned", aConnSub.plannedArrival);
						await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.ArrivalDelaySeconds`, "ArrivalDelaySeconds", "ArrivalDelaySeconds", aConnSub.arrivalDelay);
						if (aConnSub.arrivalDelay === 0 && aConnSub.arrivalDelay < 60){
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.ArrivalOnTime`, "ArrivalOnTime", "ArrivalOnTime", true);
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.ArrivalDelayed`, "ArrivalDelayed", "ArrivalDelayed", false);
						} else if (aConnSub.arrivalDelay >= 60){
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.ArrivalOnTime`, "ArrivalOnTime", "ArrivalOnTime", false);
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.ArrivalDelayed`, "ArrivalDelayed", "ArrivalDelayed", true);
						} else if (aConnSub.arrivalDelay === null) {
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.ArrivalOnTime`, "ArrivalOnTime", "ArrivalOnTime", false);
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.ArrivalDelayed`, "ArrivalDelayed", "ArrivalDelayed", false);
						}
					} catch (err){
						throw new Error(`Journey-Section (Route #${iRouteIndex} Journey #${iJourneysCurrent} Section #${j})${err}`);
					} 
					// Line information
					try{ 
						if (aConnSub["line"]){ 
							await SetChannel(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line`, aConnSub.line.name, "Line");
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line.Name`, "Line Name", "Line Name", aConnSub.line.name);
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line.Mode`, "Line Mode", "Line Mode", aConnSub.line.mode);
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line.Product`, "Line Product", "Line Product", aConnSub.line.product);
							if (aConnSub.line["operator"]){ 
								await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line.Operator`, "Line Operator", "Line Operator", aConnSub.line.operator.name);
							} else{
								await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line.Operator`, "Line Operator", "Line Operator", "");
							} 	
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line.Direction`, "Line Direction", "Line Direction", aConnSub.direction);
						} else{
							await deleteObject(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line.Name`);
							await deleteObject(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line.Mode`);
							await deleteObject(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line.Product`);
							await deleteObject(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line.Operator`);
							await deleteObject(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line.Direction`);
							await deleteObject(`${iRouteIndex.toString()}.${iJourneysCurrent}.${j}.Line`);
						} 
					} catch (err){
						throw new Error(`Journey-Line (Route #${iRouteIndex} Journey #${iJourneysCurrent} Section #${j})${err}`);
					} 	
					// Save overall arrival and final objects
					try{ 
						if (parseInt(j) === iCounterSection){
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.Arrival`, "Arrival", "Arrival", aConnSub.arrival);
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.ArrivalPlanned`, "ArrivalPlanned", "ArrivalPlanned", aConnSub.plannedArrival);
							await SetTextState(`${iRouteIndex.toString()}.${iJourneysCurrent}.ArrivalDelaySeconds`, "ArrivalDelaySeconds", "ArrivalDelaySeconds", aConnSub.arrivalDelay);
							// Arrival on time or delayed
							if (aConnSub.arrivalDelay === 0 && aConnSub.arrivalDelay < 60){
								await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.ArrivalOnTime`, "ArrivalOnTime", "ArrivalOnTime", true);
								await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.ArrivalDelayed`, "ArrivalDelayed", "ArrivalDelayed", false);
								sHTMLShort = `${sHTMLShort}<td><font color="green">${adapter.formatDate(new Date(aConnSub.arrival), "hh:mm")}</font></td></tr>`;
							} else if (aConnSub.arrivalDelay > 60){
								await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.ArrivalOnTime`, "ArrivalOnTime", "ArrivalOnTime", false);
								await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.ArrivalDelayed`, "ArrivalDelayed", "ArrivalDelayed", true);
								sHTMLShort = `${sHTMLShort}<td><font color="red">${adapter.formatDate(new Date(aConnSub.arrival), "hh:mm")}</font></td></tr>`;
							} else{
								await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.ArrivalOnTime`, "ArrivalOnTime", "ArrivalOnTime", false);
								await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.ArrivalDelayed`, "ArrivalDelayed", "ArrivalDelayed", false);
								sHTMLShort = `${sHTMLShort}<td>${adapter.formatDate(new Date(aConnSub.arrival), "hh:mm")}</td></tr>`;
							}
							// Final objects
							await SetBoolState(`${iRouteIndex.toString()}.${iJourneysCurrent}.TransfersReachable`, "TransfersReachable", "TransfersReachable", bTransfersReachable);
							await deleteUnusedSections(iRouteIndex, parseInt(iJourneysCurrent), iCounterSection);
						} 
					} catch (err){
						throw new Error(`Journey-Overall2 (Route #${iRouteIndex} Journey #${iJourneysCurrent} Section #${j})${err}`);
					} 	
				}	
			}
			sHTMLShort = `${sHTMLShort}</table>`
			if (adapter.config.CreateHTML === true){
				await SetTextState(`${iRouteIndex.toString()}.HTML`, "HTML", "HTML", sHTMLShort);
			} else{
				await deleteObject(`${iRouteIndex.toString()}.HTML`);
			} 
			await deleteUnusedConnections(iRouteIndex, 2);
		} else {
			try{ 
				iCounterRoutesDisabled++;
				await deleteConnections(iRouteIndex)
				adapter.log.debug(`Route #${iRouteIndex.toString()} from ${oRoute.station_from} to ${oRoute.station_to} disabled`);
				await SetBoolState(`${iRouteIndex.toString()}.Enabled`, `Configuration State of Route #${iRouteIndex.toString()}`, "Route State from Adapter configuration", false)
			} catch (err){
				throw new Error(`Route-Disabled (Route #${iRouteIndex})${err}`);
			} 	
		}
	} catch(e){
		adapter.log.error(`Exception in getRoute [${e}]`);
	}
}
//#endregion

//#region Helper Function getStation
/**
 * Helper function for StationSearch in Admin
 * @param {string} sProvider Configured provider in Admin
 * @param {string} sSearchString Searchstring entered in Admin
 */
async function getStation(sProvider, sSearchString){
	adapter.log.silly(`Search: Provider = ${sProvider} SearchString = ${sSearchString}`);
	/*let client = null;
	if (Provider === "DB") {	
		client = createClient(dbProfile, 'ioBroker.DBFahrplan')
	} else{
		return null;
	} */
	const sResult = await hClient.locations(sSearchString, {results: 10});
	adapter.log.silly(`STATION: ${JSON.stringify(sResult)}`);
	return sResult;
} 
//#endregion

//#region Helper Function SetTextState
/**
* Sets Text State
* @param {string} sStateName Name of the State
* @param {string} sDisplayName Displayed Name of the State
* @param {string} sDescription Description of the State
* @param {string} sValue Value of the State
*/
async function SetTextState(sStateName, sDisplayName, sDescription, sValue){
	try{ 
		await adapter.setObjectAsync(sStateName, {
			type: "state",
			common: {
				name: sDisplayName,
				type: "string",
				role: "state",
				read: true,
				write: false,
				desc: sDescription
			},
			native: {},
		});	
		await adapter.setStateAsync(sStateName, { val: sValue, ack: true });
		return true;
	}catch(e){
		adapter.log.error(`Exception in SetTextState [${e}]`);
		throw `Exception in SetTextState [${e}]`;
	} 	
} 
//#endregion

//#region Helper Function SetBoolState
/**
* Sets boolean State
* @param {string} sStateName Name of the State
* @param {string} sDisplayName Displayed Name of the State
* @param {string} sDescription Description of the State
* @param {boolean} bValue Value of the State
*/
async function SetBoolState(sStateName, sDisplayName, sDescription, bValue){
		try{ 
		await adapter.setObjectAsync(sStateName, {
			type: "state",
			common: {
				name: sDisplayName,
				type: "boolean",
				role: "state",
				read: true,
				write: false,
				desc: sDescription
			},
			native: {},
		});	
		await adapter.setStateAsync(sStateName, { val: bValue, ack: true });
		return true;
	} catch (e){
		adapter.log.error(`Exception in SetBoolState [${e}]`);
		throw `Exception in SetBoolState [${e}]`;
	} 	
}
//#endregion

//#region Helper Function SetChannel
/**
* Sets and creates channel object
* @param {string} sStateName Name of the Channel
* @param {string} sDisplayName Displayed Name of the Channel
* @param {string} sDescription Description of the Channel
*/
async function SetChannel(sStateName, sDisplayName, sDescription){
	try{ 
		await adapter.setObjectNotExistsAsync(sStateName,{
			type: "channel",
			common:{
				name: sDisplayName,
				desc: sDescription
			},
			native:{} 
		});
		return true;
	} catch (e){
		adapter.log.error(`Exception in SetChannel [${e}]`);
		throw `Exception in SetChannel [${e}]`;
	} 
}
//#endregion

//#region Helper Function deleteObject
/**
* Deletes object
* @param {string} sStateName Name of the State
*/
async function deleteObject(sStateName){
	try{ 
		let State = await adapter.getStateAsync(sStateName);
		if (State !== null){
			adapter.delObject(sStateName);
		} 
	}catch(err){
		adapter.log.error(err);
	}
} 
//#endregion

//#region Helper Function deleteConnections
/**
* Sets boolean State
* @param {Number} iRoute Number of Route from configuration
*/
async function deleteConnections(iRoute){
	try{ 
		let States = await adapter.getStatesOfAsync(iRoute.toString());
		for (let State of States){
			if (State["_id"] !== `${adapter.name}.${adapter.instance}.${iRoute}.Enabled`) { 
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
* @param {Number} iRoute Number of Route from configuration
* @param {Number} iConnection Number of Connection
* @param {Number} iSections Number of Sections in Connection
*/
async function deleteUnusedSections(iRoute, iConnection, iSections){
	try{ 
		let States = await adapter.getStatesAsync(`${iRoute.toString()}.${iConnection.toString()}.*`);
		let SectionRegEx = `${adapter.name}.${adapter.instance}.${iRoute.toString()}.${iConnection.toString()}.(\\d*).*$`;
		adapter.log.silly(`Delete Route #${iRoute} Connection #${iConnection} with max section # ${iSections} and regex:${SectionRegEx}`);	
		for (let State in States){
			let Searcher = State.toString().match(new RegExp(SectionRegEx));
			if (Searcher !== null){ 
				if (parseInt(Searcher[1]) > iSections ){
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
* @param {Number} iRoute Number of Route from configuration
* @param {Number} iConnections Number of Connections in Route
*/
async function deleteUnusedConnections(iRoute, iConnections){
	try{ 
		let States = await adapter.getStatesAsync(`${iRoute.toString()}.*`);
		let SectionRegEx = `${adapter.name}.${adapter.instance}.${iRoute.toString()}.(\\d*).*$`;
		adapter.log.silly(`Delete Route #${iRoute} with max Connection #${iConnections} and regex:${SectionRegEx}`);	
		for (let State in States){
			let Searcher = State.toString().match(new RegExp(SectionRegEx));
			if (Searcher !== null){ 
				if (parseInt(Searcher[1]) > iConnections ){
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