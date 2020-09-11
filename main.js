"use strict";

const utils = require("@iobroker/adapter-core");
const fHelpers = require("./lib/helper.js");
const fRoute = require("./lib/route.js");
const fRouteOptions = require("./lib/routeoptions.js");
const fDepTT = require("iobroker.fahrplan/lib/deptt.js");
// const fStation = require("./lib/station.js");

//#region Global Variables
const hCreateClient = require("hafas-client");
const hDBprofile = require("hafas-client/p/db");
const hOEBBprofile = require("hafas-client/p/oebb");
// const adapter = new utils.Adapter('fahrplan');
let iUpdateInterval = 5;
let tUpdateTimeout = null;
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
		super({
			...options,
			name: "fahrplan",
		});
		try{
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
			const SysConf = await this.getForeignObjectAsync("system.config");
			if (SysConf && SysConf.common && SysConf.common.language) {
				this.SysLang = SysConf.common.language;
			}
			if (this.config.Provider === "DB") {
				this.helper.hClient = hCreateClient(hDBprofile, "ioBroker.Fahrplan");
			} else if (this.config.Provider === "OEBB") {
				this.helper.hClient = hCreateClient(hOEBBprofile, "ioBroker.Fahrplan");
			} else{
				this.log.error("Unknown provider configured");
				this.terminate("Unknown provider configured");
			}
			this.log.info(`Adapter started, Updates every ${iUpdateInterval} minutes`);
			this.updateTimer();
		} catch(e){
			this.helper.ErrorReporting(e, "Exception starting Adapter", "main", "onReady");
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
					const jSearchResult = await this.helper.getStation(obj.message.provider, obj.message.station);
					if (obj.callback) this.sendTo(obj.from, obj.command, jSearchResult, obj.callback);
				}
			}
		}catch(e){
			this.helper.ErrorReporting(e, "Exception receiving Message for Adapter", "main", "onMessage");
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
			clearTimeout(tUpdateTimeout);
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
	updateTimer(){
		try{
			tUpdateTimeout && clearTimeout(tUpdateTimeout);
			this.log.silly("Timer Event");
		} catch(e){
			this.helper.ErrorReporting(e, "Exception executing Timer action", "main", "updateTimer", "ClearTimer");
		}
		try{
			// Checking Routes for Updates
			const aRoutesConfig = this.config.routes || new Array();
			if (typeof aRoutesConfig !== "undefined" && aRoutesConfig.length > 0){
				this.log.debug(`${aRoutesConfig.length} Routes defined, continuing`);
				iCounterRoutes = 0;
				iCounterRoutesDisabled = 0;
				iCounterRoutesEnabled = 0;
				for (const iRouteConfigCurrent in aRoutesConfig) {
					this.getRoute(aRoutesConfig[iRouteConfigCurrent], parseInt(iRouteConfigCurrent));
					iCounterRoutes++;
				}
				this.log.info(`Updated ${iCounterRoutes} routes, ${iCounterRoutesEnabled} enabled and ${iCounterRoutesDisabled} disabled`);
			}
			else
			{
				this.log.info("No routes defined");
			}
		} catch (e)	{
			this.helper.ErrorReporting(e, "Exception executing Timer action", "main", "updateTimer", "UpdateRoutes");
		}
		try{
			// Checking departure timetable for updates
			const aDepTTConfig = this.config.departuretimetable || new Array();
			if (typeof aDepTTConfig !== "undefined" && aDepTTConfig.length > 0){
				this.log.debug(`${aDepTTConfig.length} Departure Timetables defined, continuing`);
				iCounterDepTT = 0;
				iCounterDepTTDisabled = 0;
				iCounterDepTTEnabled = 0;
				for (const iDepTTConfigCurrent in aDepTTConfig) {
					this.getDepartureTimetable(aDepTTConfig[iDepTTConfigCurrent], parseInt(iDepTTConfigCurrent));
					iCounterDepTT++;
				}
				this.log.info(`Updated ${iCounterDepTT} departure timetables, ${iCounterDepTTEnabled} enabled and ${iCounterDepTTDisabled} disabled`);
			}
			else
			{
				this.log.info("No departure timetabled defined");
			}
		}catch(e){
			this.helper.ErrorReporting(e, "Exception executing Timer action", "main", "updateTimer", "UpdateDepartureTimetables");
		}
		try{
			tUpdateTimeout = setTimeout(() => {
				this.updateTimer();
			}, (this.config.UpdateInterval * 60 * 1000));
		}catch(e){
			this.helper.ErrorReporting(e, "Exception executing Timer action", "main", "updateTimer", "SettingTimer");
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
				const Route = new fRoute(this.helper);
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
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "StationFrom", {station_id: oRoute.station_from, json: Route.StationFrom.json});
					return;
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
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "StationTo", {station_id: oRoute.station_to, json: Route.StationTo.json});
					return;
				}
				// Building Base-State for Connection, set Configuration State
				try{
					await Route.writeBaseStates();
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "WriteBaseStates");
				}
				// Searching route
				try{
					const RouteOptions = new fRouteOptions(this.helper);
					RouteOptions.via = oRoute.station_via;
					if (oRoute.transfers >= 0) RouteOptions.transfers = parseInt(oRoute.transfers);
					RouteOptions.bycicles = oRoute.bycicles;
					RouteOptions.setProducts(oRoute.traintype.toString());
					this.log.silly(`Route #${iRouteIndex.toString()} ROUTEOPTIONS: ${JSON.stringify(RouteOptions.returnRouteOptions())}`);
					await Route.getRoute(RouteOptions);
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "SearchRoute");
					return;
				}
				// Writing Route
				try{
					await Route.writeStates();
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "WriteStates");
					return;
				}
				// Writing HTML Output for Route
				try{
					await Route.writeHTML();
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "WriteHTML");
					return;
				}
			} else {
				try{
					iCounterRoutesDisabled++;
					await this.helper.deleteConnections(iRouteIndex);
					this.log.debug(`Route #${iRouteIndex.toString()} from ${oRoute.station_from} to ${oRoute.station_to} disabled`);
					await this.helper.SetBoolState(`${iRouteIndex.toString()}.Enabled`, `Configuration State of Route #${iRouteIndex.toString()}`, "Route State from Adapter configuration", false);
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "Disabled");
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
				iCounterDepTTEnabled++;
				// Creating Route Object
				const DepTT = new fDepTT(this.helper);
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
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "Station", {station_id: oDepTT.station_from, json: DepTT.StationFrom.json});
					return;
				}
				// Building Base-State for Connection, set Configuration State
				try{
					await DepTT.writeBaseStates();
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "WriteBaseStates");
					return;
				}
				// Searching Departure Timetable
				try{
					await DepTT.getDepTT();
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "Get");
					return;
				}
				// Writing Departure Timetable
				try{
					await DepTT.writeStates();
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "WriteStates");
					return;
				}
				// Writing HTML Output for Departure Timetable
				try{
					await DepTT.writeHTML();
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "WriteHTML");
					return;
				}
			} else {
				try{
					iCounterDepTTDisabled++;
					await this.helper.deleteDepTT(iDepTTIndex);
					await this.helper.SetBoolState(`DepartureTimetable${iDepTTIndex.toString()}.Enabled`, `Configuration State of Departure Timetable #${iDepTTIndex.toString()}`, "Departure Timetable State from Adapter configuration", false);
				} catch (e){
					this.helper.ErrorReporting(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "Disabled");
					return;
				}
			}
		} catch(e){
			this.helper.ErrorReporting(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "Unkown");
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