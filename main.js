"use strict";

const utils = require("@iobroker/adapter-core");
const fHelpers = require("./lib/helper.js");
const fRoute = require("./lib/route.js");
const fOptions = require("./lib/options");
const fDepTT = require("./lib/deptt.js");
const fStation = require("./lib/station.js");
// const fStation = require("./lib/station.js");

//#region Global Variables
const hCreateClient = require("hafas-client");
const hDBprofile = require("hafas-client/p/db");
const hOEBBprofile = require("hafas-client/p/oebb");
const hSBBprofile = require("hafas-client/p/sbb");
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
		this.helper = new fHelpers(this);
		try{
			if (this.config.UpdateInterval){
				iUpdateInterval = this.config.UpdateInterval;
			}
			const SysConf = await this.getForeignObjectAsync("system.config");
			if (SysConf && SysConf.common && SysConf.common.language) {
				this.SysLang = SysConf.common.language;
			}
			if (this.config.Provider === "DB" && this.helper !== undefined) {
				this.helper.hClient = hCreateClient(hDBprofile ,"ioBroker.Fahrplan");
				this.helper.hProfile = hDBprofile;
			} else if (this.config.Provider === "OEBB" && this.helper !== undefined) {
				this.helper.hClient = hCreateClient(hOEBBprofile, "ioBroker.Fahrplan");
				this.helper.hProfile = hOEBBprofile;
			} else if (this.config.Provider === "SBB" && this.helper !== undefined) {
				this.helper.hClient = hCreateClient(hSBBprofile, "ioBroker.Fahrplan");
				this.helper.hProfile = hSBBprofile;
			} else{
				this.log.error("Unknown provider configured");
				this.terminate("Unknown provider configured");
			}
			this.helper.ReportingInfo("Info", "Adapter", `Adapter started, Updates every ${iUpdateInterval} minutes`, "main", "onReady", "", JSON.stringify(this.config));
			this.updateTimer();
		} catch(e){
			if (this.helper) this.helper.ReportingError(e, "Exception starting Adapter", "main", "onReady");
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
				if (obj.command === "getStations" && obj.message["station"] && obj.message["station"].length > 0) {
					// @ts-ignore Provider and message always in message
					const jSearchResult = await this.helper.getStation(obj.message.provider, obj.message.station);
					if (obj.callback) this.sendTo(obj.from, obj.command, jSearchResult, obj.callback);
				} else if(obj.command === "verifyConfig"){
					// @ts-ignore Provider and message always in message
					const ConfigVerify = await this.helper.verifyConfig(obj.message);
					if (obj.callback) this.sendTo(obj.from, obj.command, ConfigVerify, obj.callback);
				}
			}
		}catch(e){
			if (this.helper) this.helper.ReportingError(e, "Exception receiving Message for Adapter", "main", "onMessage");
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
			if (this.helper) this.helper.ReportingInfo("Debug", "Adapter", `Adapter unloading`, "main", "onUnload");
			if (this.helper) this.helper.isUnloaded = true;
			clearTimeout(tUpdateTimeout);
			if (this.helper) this.helper.ReportingInfo("Debug", "Adapter", `Timers cleaned up`, "main", "onUnload");
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
	async updateTimer(){
		try{
			tUpdateTimeout && clearTimeout(tUpdateTimeout);
			if (this.helper) this.helper.ReportingInfo("Debug", "Adapter", `Timer Event`, "main", "updateTimer");
		} catch(e){
			if (this.helper) this.helper.ReportingError(e, "Exception executing Timer action", "main", "updateTimer", "ClearTimer");
		}
		try{
			// Checking Routes for Updates
			const aRoutesConfig = this.config.routes || new Array();
			if (typeof aRoutesConfig !== "undefined" && aRoutesConfig.length > 0){
				if (this.helper) this.helper.ReportingInfo("Debug", "Route", `${aRoutesConfig.length} Routes defined, continuing`, "main", "updateTimer");
				iCounterRoutes = 0;
				iCounterRoutesDisabled = 0;
				iCounterRoutesEnabled = 0;
				for (const iRouteConfigCurrent in aRoutesConfig) {
					await this.getRoute(aRoutesConfig[iRouteConfigCurrent], parseInt(iRouteConfigCurrent));
					iCounterRoutes++;
				}
				if (this.helper) this.helper.ReportingInfo("Info", "Route", `Updated ${iCounterRoutes} routes, ${iCounterRoutesEnabled} enabled and ${iCounterRoutesDisabled} disabled`, "main", "updateTimer");
			}
			else
			{
				if (this.helper) this.helper.ReportingInfo("Info", "Route", "No routes defined", "main", "updateTimer");
			}
		} catch (e)	{
			if (this.helper) this.helper.ReportingError(e, "Exception executing Timer action", "main", "updateTimer", "UpdateRoutes");
		}
		try{
			// Checking departure timetable for updates
			const aDepTTConfig = this.config.departuretimetable || new Array();
			if (typeof aDepTTConfig !== "undefined" && aDepTTConfig.length > 0){
				if (this.helper) this.helper.ReportingInfo("Debug", "Departure Timetable", `${aDepTTConfig.length} Departure Timetables defined, continuing`, "main", "updateTimer", "", JSON.stringify(aDepTTConfig));
				iCounterDepTT = 0;
				iCounterDepTTDisabled = 0;
				iCounterDepTTEnabled = 0;
				for (const iDepTTConfigCurrent in aDepTTConfig) {
					await this.getDepartureTimetable(aDepTTConfig[iDepTTConfigCurrent], parseInt(iDepTTConfigCurrent));
					iCounterDepTT++;
				}
				if (this.helper) this.helper.ReportingInfo("Info", "Departure Timetable", `Updated ${iCounterDepTT} departure timetables, ${iCounterDepTTEnabled} enabled and ${iCounterDepTTDisabled} disabled`, "main", "updateTimer");
			}
			else
			{
				if (this.helper) this.helper.ReportingInfo("Info", "Departure Timetable", "No departure timetabled defined", "main", "updateTimer");
			}
		}catch(e){
			if (this.helper) this.helper.ReportingError(e, "Exception executing Timer action", "main", "updateTimer", "UpdateDepartureTimetables");
		}
		try{
			tUpdateTimeout = setTimeout(() => {
				this.updateTimer();
			}, (this.config.UpdateInterval * 60 * 1000));
		}catch(e){
			if (this.helper) this.helper.ReportingError(e, "Exception executing Timer action", "main", "updateTimer", "SettingTimer");
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
				const Station = new fStation(this.helper);
				if (oRoute.station_from === "0" || oRoute.station_from === "" || await Station.verifyStation(oRoute.station_from) !== true || oRoute.station_to === "0" || oRoute.station_to === "" || await Station.verifyStation(oRoute.station_to) !== true){
					this.log.error(`Unknown Station defined in Route #${iRouteIndex}`);
					return;
				}
				if (oRoute.station_via !== ""){
					if (await Station.verifyStation(oRoute.station_from) !== true){
						this.log.error(`Unknown Station defined in Route #${iRouteIndex}`);
						return;
					}
				}
				if (oRoute.station_via === "0"){
					oRoute.station_via = "";
				}
				if (oRoute.station_from === oRoute.station_to){
					this.log.error(`Identical Start and Destination defined in Route #${iRouteIndex}`);
					return;
				}
				if (! (oRoute.traintype.length > 0) ){
					this.log.error(`No vehicle defined in Route #${iRouteIndex}`);
					return;
				}
				iCounterRoutesEnabled++;
				if (this.helper) this.helper.ReportingInfo("Debug", "Route", `Route #${iRouteIndex.toString()} from ${oRoute.station_from} to ${oRoute.station_to} running`, "main", "getRoute", "", JSON.stringify(oRoute));
				// Creating Route Object
				const Route = new fRoute(this.helper);
				Route.NumDeps = parseInt(oRoute.number_of_departures) || 3;
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
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "StationFrom", {station_id: oRoute.station_from, json: Route.StationFrom.json});
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
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "StationTo", {station_id: oRoute.station_to, json: Route.StationTo.json});
					return;
				}
				// Building Base-State for Connection, set Configuration State
				try{
					await Route.writeBaseStates();
				} catch (e){
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "WriteBaseStates");
				}
				// Searching route
				try{
					const RouteOptions = new fOptions(this.helper);
					RouteOptions.results = Route.NumDeps;
					RouteOptions.via = oRoute.station_via;
					if (oRoute.transfers >= 0) RouteOptions.transfers = parseInt(oRoute.transfers);
					RouteOptions.bycicles = oRoute.bycicles;
					RouteOptions.setProducts(oRoute.traintype.toString());
					RouteOptions.depsOffsetMin = parseInt(oRoute.timeoffset_of_departures) || 0;
					if (this.helper) this.helper.ReportingInfo("Debug", "Route", `Route #${iRouteIndex.toString()} starting with Options: ${JSON.stringify(RouteOptions.returnRouteOptions())}`, "main", "getRoute", "", JSON.stringify(RouteOptions.returnRouteOptions()));
					await Route.getRoute(RouteOptions);
				} catch (e){
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "SearchRoute");
					return;
				}
				// Writing Route
				try{
					await Route.writeStates();
				} catch (e){
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "WriteStates");
					return;
				}
				// Writing HTML Output for Route
				try{
					await Route.writeHTML();
				} catch (e){
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "WriteHTML");
					return;
				}
			} else {
				try{
					iCounterRoutesDisabled++;
					if (this.helper) await this.helper.deleteConnections(iRouteIndex);
					if (this.helper) this.helper.ReportingInfo("Debug", "Route", `Route #${iRouteIndex.toString()} from ${oRoute.station_from} to ${oRoute.station_to} disabled`, "main", "getRoute", "", JSON.stringify(oRoute));
					if (this.helper) await this.helper.SetBoolState(`${iRouteIndex.toString()}.Enabled`, `Configuration State of Route #${iRouteIndex.toString()}`, "Route State from Adapter configuration", false);
				} catch (e){
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Route ${iRouteIndex}`, "main", "getRoute", "Disabled");
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
				const Station = new fStation(this.helper);
				if (oDepTT.station_from === "0" || await Station.verifyStation(oDepTT.station_from) === false){
					this.log.error(`Unknown Station defined in Departure Timetable #${iDepTTIndex}`);
					return;
				}
				iCounterDepTTEnabled++;
				if (this.helper) this.helper.ReportingInfo("Debug", "Departure Timetable", `Departure Timetable #${iDepTTIndex.toString()} for ${oDepTT.station_from} running`, "main", "getDepartureTimetable", "", JSON.stringify(oDepTT));
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
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "Station", {station_id: oDepTT.station_from, json: DepTT.StationFrom.json});
					return;
				}
				// Building Base-State for Connection, set Configuration State
				try{
					await DepTT.writeBaseStates();
				} catch (e){
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "WriteBaseStates");
					return;
				}
				// Searching Departure Timetable
				try{
					const DepTTOptions = new fOptions(this.helper);
					DepTTOptions.results = parseInt(oDepTT.number_of_departures) || 3;
					if (Array.isArray(oDepTT.traintype)){
						DepTTOptions.setProducts(oDepTT.traintype.toString());
					} else{
						DepTTOptions.setProducts(["all"].toString());
					}
					DepTTOptions.depsOffsetMin = parseInt(oDepTT.timeoffset_of_departures) || 0;
					if (this.helper) this.helper.ReportingInfo("Debug", "Departure Timetable", `Departure Timetable #${iDepTTIndex.toString()} running with Options: ${JSON.stringify(DepTTOptions.returnDepTTOptions())}`, "main", "getDepartureTimetable", "", JSON.stringify(DepTTOptions.returnDepTTOptions()));
					await DepTT.getDepTT(DepTTOptions);
				} catch (e){
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "Get");
					return;
				}
				// Writing Departure Timetable
				try{
					await DepTT.writeStates();
				} catch (e){
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "WriteStates");
					return;
				}
				// Writing HTML Output for Departure Timetable
				try{
					await DepTT.writeHTML();
				} catch (e){
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "WriteHTML");
					return;
				}
			} else {
				try{
					iCounterDepTTDisabled++;
					if (this.helper) await this.helper.deleteDepTT(iDepTTIndex);
					if (this.helper) await this.helper.SetBoolState(`DepartureTimetable${iDepTTIndex.toString()}.Enabled`, `Configuration State of Departure Timetable #${iDepTTIndex.toString()}`, "Departure Timetable State from Adapter configuration", false);
				} catch (e){
					if (this.helper) this.helper.ReportingError(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "Disabled");
					return;
				}
			}
		} catch(e){
			if (this.helper) this.helper.ReportingError(e, `Exception receiving Departure Timetable ${iDepTTIndex}`, "main", "getDepartureTimetable", "Unkown");
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