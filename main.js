"use strict";

const utils = require("@iobroker/adapter-core");
const fHelpers = require("./lib/helper.js");
const fRoute = require("./lib/route.js");
const fRouteOptions = require("./lib/routeoptions.js");
const fDepTT = require("iobroker.fahrplan/lib/deptt.js");
// const fStation = require("./lib/station.js");

//#region Global Variables
const hCreateClient = require('hafas-client');
const hDBprofile = require('hafas-client/p/db');
const hOEBBprofile = require('hafas-client/p/oebb');
// const adapter = new utils.Adapter('fahrplan');
let iUpdateInterval = 5;
let tUpdateRoutesTimeout = null;
let iCounterRoutes = 0;
let iCounterRoutesEnabled = 0;
let iCounterRoutesDisabled = 0;
let iCounterDepTT = 0;
let iCounterDepTTEnabled = 0;
let iCounterDepTTDisabled = 0;
//#endregion


class Fahrplan extends utils.Adapter {

	//#region Constructor
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		try{ 
			super({
				...options,
				name: "fahrplan",
			});
			this.helper = new fHelpers(this);
			this.on("ready", this.onReady.bind(this));
			this.on("message", this.onMessage.bind(this));
			this.on("unload", this.onUnload.bind(this));
		} catch(e){
			this.log.error(`Exception initializing Adapter [${e}]`);
		} 
	}
	//#endregion

	//#region Default Function OnReady
	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		try{ 
			if (this.config.UpdateInterval){
				iUpdateInterval = this.config.UpdateInterval;
			} 
			let SysConf = await this.getForeignObjectAsync("system.config");
			if (SysConf && SysConf.common && SysConf.common.language) {
				this.SysLang = SysConf.common.language;
			}
			if (this.config.Provider === "DB") {	
				this.helper.hClient = hCreateClient(hDBprofile, 'ioBroker.Fahrplan')
			} else if (this.config.Provider === "OEBB") {	
					this.helper.hClient = hCreateClient(hOEBBprofile, 'ioBroker.Fahrplan')
			} else{
				this.log.error("Unknown provider configured");
				this.terminate("Unknown provider configured")
			} 
			this.log.info(`Adapter started, Updates every ${iUpdateInterval} minutes`);
			this.updateRoutesTimer();
		} catch(e){
			this.log.error(`Exception starting Adapter [${e}]`);
		} 	
	}
	//#endregion

	//#region onMessage
	/**
	* Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	* Using this method requires "common.message" property to be set to true in io-package.json
	* @param {ioBroker.Message} obj
	*/
    async onMessage(obj) {
		try{ 
			if (typeof obj === "object" && obj.message) {
				if (obj.command === "getStations") {
					// @ts-ignore Provider and message always in message
					let jSearchResult = await this.helper.getStation(obj.message.provider, obj.message.station);
					if (obj.callback) this.sendTo(obj.from, obj.command, jSearchResult, obj.callback);
				}
			}
		}catch(e){
			this.log.error(`Exception receiving Message for Adapter [${e}]`);
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
			this.log.silly("Adapter unloaded");
			clearTimeout(tUpdateRoutesTimeout);
			this.log.info("cleaned everything up...");
			callback();
		} catch (e) {
			callback();
		}
	}
	//#endregion

	//#region Function updateRoutesTimer
	/**
	 * Timer function running in configured interval
	 */
	updateRoutesTimer(){
		try{ 
			tUpdateRoutesTimeout && clearTimeout(tUpdateRoutesTimeout);
			this.log.silly("Timer Event");
			// Checking Routes for Updates
			let aRoutesConfig = this.config.routes || new Array(); 
			if (typeof aRoutesConfig !== "undefined" && aRoutesConfig.length > 0){
				this.log.debug("Routes defined, continuing");
				iCounterRoutes = 0;
				iCounterRoutesDisabled = 0;
				iCounterRoutesEnabled = 0;
				for (let iRouteConfigCurrent in aRoutesConfig) {
					this.getRoute(aRoutesConfig[iRouteConfigCurrent], parseInt(iRouteConfigCurrent));
					iCounterRoutes++;
				}
				this.log.info(`Updated ${iCounterRoutes} routes, ${iCounterRoutesEnabled} enabled and ${iCounterRoutesDisabled} disabled`);
			}
			else
			{	 	
				this.log.info("No routes defined");
			}
			// Checking departure timetable for updates
			let aDepTTConfig = this.config.departuretimetable || new Array();
			if (typeof aDepTTConfig !== "undefined" && aDepTTConfig.length > 0){
				this.log.debug("Departure Timetables defined, continuing");
				iCounterDepTT = 0;
				iCounterDepTTDisabled = 0;
				iCounterDepTTEnabled = 0;
				for (let iDepTTConfigCurrent in aDepTTConfig) {
					this.getDepartureTimetable(aDepTTConfig[iDepTTConfigCurrent], parseInt(iDepTTConfigCurrent));
					iCounterDepTT++;
				}
				this.log.info(`Updated ${iCounterDepTT} departure timetables, ${iCounterDepTTEnabled} enabled and ${iCounterDepTTDisabled} disabled`);
			}
			else
			{	 	
				this.log.info("No departure timetabled defined");
			}
			tUpdateRoutesTimeout = setTimeout(() => {
				this.updateRoutesTimer();
			}, (this.config.UpdateInterval * 60 * 1000));
		}catch(e){
			this.log.error(`Exception executing Timer [${e}]`);
		} 	
	}
	//#endregion

	//#region Function getRoute
	/**
	* Gets Route information from Website and extracts connections
	* @param {object} oRoute Single configuration entry for route
	* @param {number} iRouteIndex Index of the configuration entry
	*/
	async getRoute(oRoute, iRouteIndex) {
		try{ 
			if (oRoute.enabled == true){
				iCounterRoutesEnabled++;
				this.log.debug(`Route #${iRouteIndex.toString()} from ${oRoute.station_from} to ${oRoute.station_to} running`);
				// Creating Route Object
				let Route = new fRoute(this.helper);
				Route.index = iRouteIndex;
				Route.enabled = true;
				// Getting Station_From details
				try{
					await Route.StationFrom.getStation(oRoute.station_from);
					if (oRoute.station_from_name !== ""){
						Route.StationFrom.customname = oRoute.station_from_name;
					} else {
						Route.StationFrom.customname = Route.StationFrom.name;
					} 
					await Route.StationFrom.writeStation(`${iRouteIndex.toString()}.StationFrom`, "From station");
				} catch (err){
					throw new Error(`Station-From (Route #${iRouteIndex})${err}`);
				} 
				// Getting Station_To details
				try{
					await Route.StationTo.getStation(oRoute.station_to);
					if (oRoute.station_to_name !== ""){
						Route.StationTo.customname = oRoute.station_to_name;
					} else {
						Route.StationTo.customname = Route.StationTo.name;
					} 
					await Route.StationTo.writeStation(`${iRouteIndex.toString()}.StationTo`, "To station");
				} catch (err){
					throw new Error(`Station-To (Route #${iRouteIndex})${err}`);
				}
				// Building Base-State for Connection, set Configuration State
				try{
					await Route.writeBaseStates();
				} catch (err){
					throw new Error(`Base-States (Route #${iRouteIndex})${err}`);
				} 
				// Searching route
				try{ 
					let RouteOptions = new fRouteOptions(this.helper);
					RouteOptions.via = oRoute.station_via;
					if (oRoute.transfers >= 0) RouteOptions.transfers = parseInt(oRoute.transfers);
					RouteOptions.bycicles = oRoute.bycicles;
					RouteOptions.setProducts(oRoute.traintype.toString());
					this.log.silly(`Route #${iRouteIndex.toString()} ROUTEOPTIONS: ${JSON.stringify(RouteOptions.returnRouteOptions())}`);
					await Route.getRoute(RouteOptions);
				} catch (err){
					throw new Error(`Route-Search (Route #${iRouteIndex})${err}`);
				} 
				// Writing Route
				try{ 
					await Route.writeStates();
				} catch (err){
					throw new Error(`Route-Write (Route #${iRouteIndex})${err}`);
				}
				// Writing HTML Output for Route
				try{
					await Route.writeHTML();
				} catch (err){
					throw new Error(`Route-HTML (Route #${iRouteIndex})${err}`);
				} 
			} else {
				try{ 
					iCounterRoutesDisabled++;
					await this.helper.deleteConnections(iRouteIndex)
					this.log.debug(`Route #${iRouteIndex.toString()} from ${oRoute.station_from} to ${oRoute.station_to} disabled`);
					await this.helper.SetBoolState(`${iRouteIndex.toString()}.Enabled`, `Configuration State of Route #${iRouteIndex.toString()}`, "Route State from Adapter configuration", false)
				} catch (err){
					throw new Error(`Route-Disabled (Route #${iRouteIndex})${err}`);
				} 	
			}
		} catch(e){
			this.log.error(`Exception in Main/getRoute [${e}]`);
		}
	}
	//#endregion

	//#region Function getDepartureTimetable
	/**
	* Gets departure timetable information from Website and extracts information
	* @param {object} oDepTT Single configuration entry for route
	* @param {number} iDepTTIndex Index of the configuration entry
	*/
	async getDepartureTimetable(oDepTT, iDepTTIndex) {
		try{ 
			if (oDepTT.enabled == true){
				iCounterRoutesEnabled++;
				// Creating Route Object
				let DepTT = new fDepTT(this.helper);
				DepTT.index = iDepTTIndex;
				DepTT.enabled = true;
				// Getting Station_From details
				try{
					await DepTT.StationFrom.getStation(oDepTT.station_from);
					if (oDepTT.station_from_name !== ""){
						DepTT.StationFrom.customname = oDepTT.station_from_name;
					} else {
						DepTT.StationFrom.customname = DepTT.StationFrom.name;
					} 
					await DepTT.StationFrom.writeStation(`DepartureTimetable${iDepTTIndex.toString()}.Station`, "Station");
				} catch (err){
					throw new Error(`Station (Departure Timetable #${iDepTTIndex})${err}`);
				}
				// Building Base-State for Connection, set Configuration State
				try{
					await DepTT.writeBaseStates();
				} catch (err){
					throw new Error(`Base-States (Departure Timetable #${iDepTTIndex})${err}`);
				} 
				// Searching Departure Timetable
				try{ 
					await DepTT.getDepTT();
				} catch (err){
					throw new Error(`DepartureTimetable-Search (Departure Timetable #${iDepTTIndex})${err}`);
				}
				// Writing Departure Timetable
				try{ 
					await DepTT.writeStates();
				} catch (err){
					throw new Error(`DepartureTimetable-Write (Departure Timetable #${iDepTTIndex})${err}`);
				}
				// Writing HTML Output for Departure Timetable
				try{
					await DepTT.writeHTML();
				} catch (err){
					throw new Error(`DepartureTimetable-HTML (Departure Timetable #${iDepTTIndex})${err}`);
				} 
			} else {
				try{ 
					iCounterDepTTDisabled++;
					await this.helper.deleteDepTT(iDepTTIndex)
					await this.helper.SetBoolState(`DepartureTimetable${iDepTTIndex.toString()}.Enabled`, `Configuration State of Departure Timetable #${iDepTTIndex.toString()}`, "Departure Timetable State from Adapter configuration", false)
				} catch (err){
					throw new Error(`Route-Disabled (Route #${iDepTTIndex})${err}`);
				} 	
			}
		} catch(e){
			this.log.error(`Exception in Main/getDepartureTimetable [${e}]`);
		}
	}
	//#endregion
}

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