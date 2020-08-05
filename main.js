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
		adapter.getForeignObjectAsync("system.config", (err, obj) => {
			if (obj && obj.common && obj.common.language) {
				SysLang = obj.common.language;
			}
		});
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
const hDBproducts ={
	nationalExpress: false,
	national: false,
	regionalExp: false,
	regional: false,
	suburban: false,
	bus: false,
	subway: false,
	tram: false,
	ferry: false,
	taxi: false
} 
const hOEBBprofile = require('hafas-client/p/oebb');
const hOEBBproducts ={
	nationalExpress: false,
	national: false,
	interregional: false,
	regional: false,
	suburban: false,
	bus: false,
	subway: false,
	tram: false,
	ferry: false,
	onCall: false
} 
let hClient = null;
const adapter = new utils.Adapter('fahrplan');
let iUpdateInterval = 5;
let tUpdateRoutesTimeout = null;
let iCounterRoutes = 0;
let iCounterRoutesEnabled = 0;
let iCounterRoutesDisabled = 0;
let SysLang = "";
// Language specific Header for HTML journey output
let sJourneyHTMLHeader ={
	"en": '<tr><th align="left">Station</th><th align="center">Time</th><th align="center">Platform</th><th align="center">Delay</th></tr>',
	"de": '<tr><th align="left">Station</th><th align="center">Zeit</th><th align="center">Plattform</th><th align="center">Verspätung</th></tr>',
	"ru": '<tr><th align="left">остановка</th><th align="center">Время</th><th align="center">Платформа</th><th align="center">задержка</th></tr>',
	"pt": '<tr><th align="left">estação</th><th align="center">Tempo</th><th align="center">Plataforma</th><th align="center">Demora</th></tr>',
	"nl": '<tr><th align="left">Station</th><th align="center">Tijd</th><th align="center">Platform</th><th align="center">Vertraging</th></tr>',
	"fr": '<tr><th align="left">Station</th><th align="center">Temps</th><th align="center">Plate-forme</th><th align="center">Retard</th></tr>',
	"it": '<tr><th align="left">Stazione</th><th align="center">Tempo</th><th align="center">piattaforma</th><th align="center">Ritardo</th></tr>',
	"es": '<tr><th align="left">Estación</th><th align="center">Hora</th><th align="center">Plataforma</th><th align="center">Retrasar</th></tr>',
	"pl": '<tr><th align="left">Stacja</th><th align="center">Czas</th><th align="center">Platforma</th><th align="center">Opóźnienie</th></tr>',
	"zh-cn": '<tr><th align="left">站</th><th align="center">时间</th><th align="center">平台</th><th align="center">延迟</th></tr>'
} 
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

//#region Class fStation
class fStation {
	constructor(){
		this.name = "";
		this.customname = "";
		this.id = null;
		this.type = "";
		this.json = "";
		this.platform = null;
		this.platformplanned = null;
	} 

	/**
	* Gets Station information from HAFAS
	* @param {number} eBhf Numeric ID for station
	*/
	async getStation(eBhf){
		this.id = eBhf;
		let aResult = null;
		try {  
			aResult = await hClient.locations(eBhf);
			this.json = JSON.stringify(aResult);
			if (aResult.length === 1){
				this.name = aResult[0].name;
				this.type = aResult[0]["type"];
			} else {
				throw new Error(`Multiple results found for station ${eBhf}`);
			}
		} catch(e) {
			throw new Error(`Exception in getStation [${e}]`);
		} 	
	}

	/**
	* Sets Station information by Object from HAFAS, e.g. from journey 
	* @param {object} Station Station object
	*/
	async setStation(Station){
		try {  
			this.id = Station.id;
			this.name = Station.name;
			this.customname = Station.name;
			this.type = Station.type;
			this.json = JSON.stringify(Station);
		} catch(e) {
			throw new Error(`Exception in setStation [${e}]`);
		} 	
	}

	/**
	* Writes Station information to ioBroker
	* @param {string} BasePath Path to channel with station information
	* @param {string} BaseDesc Base Description
	*/
	async writeStation(BasePath, BaseDesc){
		try {  
			await SetChannel(`${BasePath}`, this.name, `${BaseDesc}`);
			await SetTextState(`${BasePath}.Name`, `${BaseDesc} Name`, `${BaseDesc} Name`, this.name);
			if (this.id === null){
				await SetTextState(`${BasePath}.eBhf`, `${BaseDesc} eBhf`, `${BaseDesc} eBhf`, "");
			} else { 
				await SetTextState(`${BasePath}.eBhf`, `${BaseDesc} eBhf`, `${BaseDesc} eBhf`, this.id.toString());
			}
			await SetTextState(`${BasePath}.CustomName`, `${BaseDesc} Custom Name`, `${BaseDesc} Custom Name`, this.customname);
			await SetTextState(`${BasePath}.Type`, `${BaseDesc} Type`, `${BaseDesc} Type`, this.type);
			if (this.platform !== null) await SetTextState(`${BasePath}.Platform`, `${BaseDesc} Platform`, `${BaseDesc} Platform`, this.platform);
			if (this.platformplanned !== null) await SetTextState(`${BasePath}.PlatformPlanned`, `${BaseDesc} PlatformPlanned`, `${BaseDesc} PlatformPlanned`, this.platformplanned);
			if (adapter.config.SaveJSON !== false){
				await SetTextState(`${BasePath}.JSON`, `${BaseDesc} JSON`, `${BaseDesc} JSON`, this.json, "json");
			}	
		} catch(e) {
			throw new Error(`Exception in writeStation [${e}]`);
		} 	
	}
}
//#endregion

//#region Class fLine
class fLine{
	constructor(){
		this.direction = "";
		this.mode = "";
		this.name = "";
		this.operator = "";
		this.product = "";
	}

	/**
	* Sets Line information by Object from HAFAS, e.g. from journey 
	* @param {object} Section Section object (contains direction)
	*/
	async setLine(Section){
		try {  
			this.direction = Section.direction;
			this.name = Section.line.name;
			this.mode = Section.line.mode;
			if (Section.line.operator) this.operator = Section.line.operator.name;
			this.product = Section.line.product;
		} catch(e) {
			throw new Error(`Exception in setLine [${e}]`);
		} 	
	}

	/**
	* Writes Line information to ioBroker
	* @param {string} BasePath Path to channel with station information
	*/
	async writeLine(BasePath){
		try {  
			await SetChannel(`${BasePath}`, this.name, "Line");
			await SetTextState(`${BasePath}.Name`, "Line Name", "Line Name", this.name);
			await SetTextState(`${BasePath}.Direction`, "Line Direction", "Line Direction", this.direction);
			await SetTextState(`${BasePath}.Mode`, "Line Mode", "Line Mode", this.mode);
			await SetTextState(`${BasePath}.Operator`, "Line Operator", "Line Operator", this.operator);
			await SetTextState(`${BasePath}.Product`, "Line Product", "Line Product", this.product);
		} catch(e) {
			throw new Error(`Exception in writeLine [${e}]`);
		} 	
	}
}
//#endregion

//#region Class fSection
class fSection{
	constructor(){
		this.StationFrom = new fStation();
		this.StationTo = new fStation();
		this.Line = new fLine();
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
			if (adapter.config.SaveObjects >= 2){
				await SetChannel(`${BasePath}`, `Section ${this.StationFrom.name} - ${this.StationTo.name}`, `Section`);
				await SetBoolState(`${BasePath}.Reachable`, "Reachable", "Reachable", this.reachable);
				// Station
				this.StationFrom.writeStation(`${BasePath}.StationFrom`, "StationFrom");
				this.StationTo.writeStation(`${BasePath}.StationTo`, "StationTo");
				// Departure Values
				await SetTextState(`${BasePath}.Departure`, "Departure", "Departure", this.departure, "date");
				await SetTextState(`${BasePath}.DeparturePlanned`, "DeparturePlanned", "DeparturePlanned", this.departurePlanned, "date");
				await SetNumState(`${BasePath}.DepartureDelaySeconds`, "DepartureDelaySeconds", "DepartureDelaySeconds", this.departureDelaySeconds);
				await SetBoolState(`${BasePath}.DepartureOnTime`, "DepartureOnTime", "DepartureOnTime", this.departureOnTime);
				await SetBoolState(`${BasePath}.DepartureDelayed`, "DepartureDelayed", "DepartureDelayed", this.departureDelayed);
				// Arrival Values
				await SetTextState(`${BasePath}.Arrival`, "Arrival", "Arrival", this.arrival, "date");
				await SetTextState(`${BasePath}.ArrivalPlanned`, "ArrivalPlanned", "ArrivalPlanned", this.arrivalPlanned, "date");
				await SetNumState(`${BasePath}.ArrivalDelaySeconds`, "ArrivalDelaySeconds", "ArrivalDelaySeconds", this.arrivalDelaySeconds);
				await SetBoolState(`${BasePath}.ArrivalOnTime`, "ArrivalOnTime", "ArrivalOnTime", this.arrivalOnTime);
				await SetBoolState(`${BasePath}.ArrivalDelayed`, "ArrivalDelayed", "ArrivalDelayed", this.arrivalDelayed);
				// Line Values
				this.Line.writeLine(`${BasePath}.Line`);
			} 
		} catch(e) {
			throw new Error(`Exception in writeSection [${e}]`);
		} 	
	}
}
//#endregion

//#region Class fJourney
class fJourney{
	constructor(){
		this.Sections = new Array();
		this.StationFrom = new fStation();
		this.StationTo = new fStation();
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
		this.notify = false;
		this.notifyText = "";
		this.notifyValue = 0;
		this.json = "";
		this.transfersReachable = true;
		this.changes = -1;
		this.html = "";
	}

	/**
	* Parses JSON-input from HAFAS journey
	* @param {object} Journey JSON result from HAFAS
	*/
	parseJourney(Journey){
		this.json = JSON.stringify(Journey);
		try{
			// Count sections
			let iCounterSection = 0;
			for (let iSectionCurrent in Journey.legs ) {
				iCounterSection++;
			}
			iCounterSection--;
			this.changes = iCounterSection;
			for (let iSectionCurrent in Journey.legs ) {
				let aConnSub = Journey.legs[iSectionCurrent];
				// Create current section object
				let CurrSection = new fSection();
				// Section Stations and Platforms, overwrite for first and last section
				CurrSection.StationFrom.setStation(aConnSub.origin);
				CurrSection.StationTo.setStation(aConnSub.destination);
				if (parseInt(iSectionCurrent) === 0){ 
					CurrSection.StationFrom = this.StationFrom;
				} 
				if (parseInt(iSectionCurrent) === iCounterSection){ 
					CurrSection.StationTo = this.StationTo;
				}
				if (aConnSub["departurePlatform"]) CurrSection.StationFrom.platform = aConnSub.departurePlatform;
				if (aConnSub["plannedDeparturePlatform"]) CurrSection.StationFrom.platformplanned = aConnSub.plannedDeparturePlatform;
				if (aConnSub["arrivalPlatform"]) CurrSection.StationTo.platform = aConnSub.arrivalPlatform;
				if (aConnSub["plannedArrivalPlatform"]) CurrSection.StationTo.platformplanned = aConnSub.plannedArrivalPlatform;
				// Section Departure information
				CurrSection.departure = aConnSub.departure;
				CurrSection.departurePlanned = aConnSub.plannedDeparture;
				if (aConnSub.departureDelay !== null && aConnSub.departureDelay >= 0){
					CurrSection.departureDelaySeconds = aConnSub.departureDelay;
					this.departureDelaySeconds = this.departureDelaySeconds + aConnSub.departureDelay;
					if (aConnSub.departureDelay === 0 && aConnSub.departureDelay < (adapter.config.DelayTime * 60)){
						CurrSection.departureOnTime = true;
					} else if (aConnSub.departureDelay >= (adapter.config.DelayTime * 60)){
						CurrSection.departureDelayed = true;
					} 
				}	
				// Overall Departure information
				if (parseInt(iSectionCurrent) === 0){ 
					this.departure = CurrSection.departure;
					this.departurePlanned = CurrSection.departurePlanned;
					this.departureDelaySeconds = CurrSection.departureDelaySeconds;
					this.departureDelayed = CurrSection.departureDelayed;
					this.departureOnTime = CurrSection.departureOnTime;
					this.StationFrom = CurrSection.StationFrom;
				}
				// Section Arrival information
				CurrSection.arrival = aConnSub.arrival;
				CurrSection.arrivalPlanned = aConnSub.plannedArrival;
				if (aConnSub.arrivalDelay !== null && aConnSub.arrivalDelay >= 0){
					CurrSection.arrivalDelaySeconds = aConnSub.arrivalDelay;
					this.arrivalDelaySeconds = this.arrivalDelaySeconds + aConnSub.arrivalDelay;
					if (aConnSub.arrivalDelay === 0 && aConnSub.arrivalDelay < (adapter.config.DelayTime * 60)){
						CurrSection.arrivalOnTime = true;
					} else if (aConnSub.arrivalDelay >= (adapter.config.DelayTime * 60)){
						CurrSection.arrivalDelayed = true;
					}
				}	
				// Overall Arrival information
				if (parseInt(iSectionCurrent) === iCounterSection){ 
					this.arrival = CurrSection.arrival;
					this.arrivalPlanned = CurrSection.arrivalPlanned;
					this.arrivalDelaySeconds = CurrSection.arrivalDelaySeconds;
					this.arrivalDelayed = CurrSection.arrivalDelayed;
					this.arrivalOnTime = CurrSection.arrivalOnTime;
					this.StationTo = CurrSection.StationTo;
				}
				// Section Line information
				if (aConnSub["line"]){ 
					CurrSection.Line.setLine(aConnSub);
				}	
				// Reachability
				if (aConnSub["reachable"]){
					if (aConnSub.reachable === false){
						CurrSection.reachable = false;
						this.transfersReachable = false;
					}	
				}
				// Walking
				if (aConnSub["walking"]){
					if (aConnSub.walking === true){
						CurrSection.walking = true;
					}	
				}
				this.Sections.push(CurrSection);
			}
		} catch (e){
			throw new Error(`Exception in setLine [${e}]`);
		} 
	}

	/**
	* Checks Journey for delays
	* @param {string} BasePath Path to channel with journey information
	* @param {number} RouteIndex Index number of Route
	*/
	async checkDelay(BasePath, RouteIndex){
		try {  
			let ConfigDelays = adapter.config.delays||[];
			let RouteDelays = ConfigDelays.filter(delay=>delay.route===RouteIndex.toString() && delay.enabled===true && delay.notistart !== "");
			if (RouteDelays.length > 0) adapter.log.silly(`Configured Delays for Route #${RouteIndex}: ${JSON.stringify(RouteDelays)}`);
			for (let iRouteDelayCurrent in RouteDelays ) {
				let RouteDelay = RouteDelays[iRouteDelayCurrent];
				if ((RouteDelay.departplan === "" || RouteDelay.departplan === adapter.formatDate(new Date(this.departure), "hh:mm")) && ( RouteDelay.days.includes("7") || RouteDelay.days.includes(new Date(this.departure).getDay().toString()))){
					let NotiStartTime = new Date(this.departurePlanned);
					NotiStartTime.setMinutes(NotiStartTime.getMinutes() - parseInt(RouteDelay.notistart));
					if (new Date() >= new Date(NotiStartTime) && new Date() <= new Date(this.departure) ){
						// this.departureDelaySeconds = 180;
						if (this.departureDelaySeconds !== 0 && this.departureDelaySeconds >= (adapter.config.DelayTime * 60)){
							let OldNotifyValue = await adapter.getStateAsync(`${BasePath}.NotifyValue`);
							adapter.log.silly(`OldNotifyValue: ${JSON.stringify(OldNotifyValue)} `);
							if (OldNotifyValue === null || !OldNotifyValue || (OldNotifyValue !== null && OldNotifyValue && OldNotifyValue.val !== null && parseInt(this.departureDelaySeconds.toString()) !== parseInt(OldNotifyValue.val.toString()))){ 
								this.notify = true;
								this.notifyValue = this.departureDelaySeconds;
								this.notifyText = await this.buildDelayNotification();
								adapter.log.silly(`DELAY NOTIFICATION: ${this.notifyText}`);
								if (RouteDelay.output_id !== ""){
									// Buidling output string
									await adapter.setForeignStateAsync(RouteDelay.output_id, this.notifyText);
								}
							}		
						} 
					}
				} 
			}	
		} catch(e) {
			throw new Error(`Exception in checkDelay [${e}]`);
		} 	
	}

	/**
	* Build delay string output
	*/
	async buildDelayNotification(){
		try{
			let sOut = "";
			switch (SysLang){
				case "de":
					sOut = `Verbindung von ${this.StationFrom.customname} nach ${this.StationTo.customname}, geplante Abfahrt ${adapter.formatDate(new Date(this.departurePlanned), "hh:mm")} verspätet sich um ${Math.ceil(this.departureDelaySeconds / 60)} Minuten`;
					break;
				default:
					sOut = `Connection from ${this.StationFrom.customname} to ${this.StationTo.customname} with planned departure ${adapter.formatDate(new Date(this.departurePlanned), "hh:mm")} is ${Math.ceil(this.departureDelaySeconds / 60)} minutes late`;
					break
			} 
			return sOut;
		} catch(e){
			throw new Error(`Exception in buildDelayNotification [${e}]`);
		} 
	}	

	/**
	* Writes Journey information to ioBroker
	* @param {string} BasePath Path to channel with journey information
	* @param {number} RouteIndex Index number of Route
	* @param {number} JourneyIndex Index number of Journey
	*/
	async writeJourney(BasePath, RouteIndex, JourneyIndex){
		try {  
			await SetChannel(`${BasePath}`, `Connection ${this.StationFrom.name} - ${this.StationTo.name}`, `Connection`);
			if (adapter.config.SaveJSON !== false){
				await SetTextState(`${BasePath}.JSON`, "Journey JSON", "Journey JSON", this.json, "json");	
			}
			if (adapter.config.SaveObjects === 1){
				await deleteUnusedSections(RouteIndex, JourneyIndex, -1);
			}
			if (adapter.config.SaveObjects >= 1){
				await SetTextState(`${BasePath}.Changes`, "Changes", "Changes", this.changes.toString());
				await SetBoolState(`${BasePath}.TransfersReachable`, "TransfersReachable", "TransfersReachable", this.transfersReachable);
				// Overall Departure Values
				await SetTextState(`${BasePath}.Departure`, "Departure", "Departure", this.departure, "date");
				await SetTextState(`${BasePath}.DeparturePlanned`, "DeparturePlanned", "DeparturePlanned", this.departurePlanned, "date");
				await SetNumState(`${BasePath}.DepartureDelaySeconds`, "DepartureDelaySeconds", "DepartureDelaySeconds", this.departureDelaySeconds);
				await SetBoolState(`${BasePath}.DepartureOnTime`, "DepartureOnTime", "DepartureOnTime", this.departureOnTime);
				await SetBoolState(`${BasePath}.DepartureDelayed`, "DepartureDelayed", "DepartureDelayed", this.departureDelayed);
				// Overall Arrival Values
				await SetTextState(`${BasePath}.Arrival`, "Arrival", "Arrival", this.arrival, "date");
				await SetTextState(`${BasePath}.ArrivalPlanned`, "ArrivalPlanned", "ArrivalPlanned", this.arrivalPlanned, "date");
				await SetNumState(`${BasePath}.ArrivalDelaySeconds`, "ArrivalDelaySeconds", "ArrivalDelaySeconds", this.arrivalDelaySeconds);
				await SetBoolState(`${BasePath}.ArrivalOnTime`, "ArrivalOnTime", "ArrivalOnTime", this.arrivalOnTime);
				await SetBoolState(`${BasePath}.ArrivalDelayed`, "ArrivalDelayed", "ArrivalDelayed", this.arrivalDelayed);
				// Notification Information
				await SetBoolState(`${BasePath}.Notify`, "Notify", "Notify", this.notify);
				await SetNumState(`${BasePath}.NotifyValue`, "NotifyValue", "NotifyValue", this.notifyValue);
				await SetTextState(`${BasePath}.NotifyText`, "NotifyText", "NotifyText", this.notifyText);
			}
			if (adapter.config.SaveObjects >= 2){
				for (let iSectionsCurrent in this.Sections) {
					this.Sections[iSectionsCurrent].writeSection(`${BasePath}.${iSectionsCurrent}`)
				}
				await deleteUnusedSections(RouteIndex, JourneyIndex, this.Sections.length - 1);
			} 
			if (adapter.config.SaveObjects === 0) {
				await deleteUnusedSections(RouteIndex, JourneyIndex, -1);
				await deleteObject(`${BasePath}.Changes`);
				await deleteObject(`${BasePath}.TransfersReachable`);
				await deleteObject(`${BasePath}.Departure`);
				await deleteObject(`${BasePath}.DeparturePlanned`);
				await deleteObject(`${BasePath}.DepartureDelaySeconds`);
				await deleteObject(`${BasePath}.DepartureOnTime`);
				await deleteObject(`${BasePath}.DepartureDelayed`);
				await deleteObject(`${BasePath}.Arrival`);
				await deleteObject(`${BasePath}.ArrivalPlanned`);
				await deleteObject(`${BasePath}.ArrivalDelaySeconds`);
				await deleteObject(`${BasePath}.ArrivalOnTime`);
				await deleteObject(`${BasePath}.ArrivalDelayed`);
			} 
		} catch(e) {
			throw new Error(`Exception in writeJourney [${e}]`);
		} 	
	}

	/*
	* Creates HTML table column with HTML
	*/
	createHTML(){
		try{
			// adapter.formatDate(new Date(aConnSub.departure), "hh:mm")
			let sHTML = "<tr>"
			// Departure Time
			if (this.departureOnTime === true){ 
				sHTML = `${sHTML}<td><font color="green">${adapter.formatDate(new Date(this.departure), "hh:mm")}</font></td>`;
			} else if (this.departureDelayed === true){
				sHTML = `${sHTML}<td><font color="red">${adapter.formatDate(new Date(this.departure), "hh:mm")}</font></td>`;
			} else{
				sHTML = `${sHTML}<td>${adapter.formatDate(new Date(this.departure), "hh:mm")}</td>`;
			}
			// Departure delay time
			if (adapter.config.CreateHTML >= 2){
				let Delay = Math.ceil(this.departureDelaySeconds / 60);
				if (this.departureOnTime === true){ 
					sHTML = `${sHTML}<td><font color="green">${Delay}</font></td>`;
				} else if (this.departureDelayed === true){
					sHTML = `${sHTML}<td><font color="red">${Delay}</font></td>`;
				} else{
					sHTML = `${sHTML}<td>${Delay}</td>`;
				}
			}
			// Departure platform
			if (adapter.config.CreateHTML >= 3){
				if (this.StationFrom.platform === this.StationFrom.platformplanned){ 
					sHTML = `${sHTML}<td><font color="green">${this.StationFrom.platform}</font></td>`;
				} else {
					sHTML = `${sHTML}<td><font color="red">${this.StationFrom.platform}</font></td>`;
				}
			}
			// Arrival Time
			if (this.arrivalOnTime === true){ 
				sHTML = `${sHTML}<td><font color="green">${adapter.formatDate(new Date(this.arrival), "hh:mm")}</font></td>`;
			} else if (this.arrivalDelayed === true){
				sHTML = `${sHTML}<td><font color="red">${adapter.formatDate(new Date(this.arrival), "hh:mm")}</font></td>`;
			} else{
				sHTML = `${sHTML}<td>${adapter.formatDate(new Date(this.arrival), "hh:mm")}</td>`;
			}
			// Arrival delay time
			if (adapter.config.CreateHTML >= 2){
				let Delay = Math.ceil(this.arrivalDelaySeconds / 60);
				if (this.arrivalOnTime === true){ 
					sHTML = `${sHTML}<td><font color="green">${Delay}</font></td>`;
				} else if (this.arrivalDelayed === true){
					sHTML = `${sHTML}<td><font color="red">${Delay}</font></td>`;
				} else{
					sHTML = `${sHTML}<td>${Delay}</td>`;
				}
			}
			// Arrival platform
			if (adapter.config.CreateHTML >= 3){
				if (this.StationTo.platform === this.StationTo.platformplanned){ 
					sHTML = `${sHTML}<td><font color="green">${this.StationTo.platform}</font></td>`;
				} else {
					sHTML = `${sHTML}<td><font color="red">${this.StationTo.platform}</font></td>`;
				}
			}
			sHTML = `${sHTML}</tr>`
			return sHTML;
		} catch(e){
			throw new Error(`Exception in createHTML [${e}]`);
		} 
	} 

	/**
	* Creates and saves HTML per Journey
	* @param {string} BasePath Path to channel with journey information
	*/
	async writeJourneyHTML(BasePath){
		try {
			if (adapter.config.CreateHTMLJourney >= 1){
				this.html = `<table><tr><th align="left" colspan="4">${this.StationFrom.customname} - ${this.StationTo.customname}</th></tr>`;
				this.html = `${this.html}${sJourneyHTMLHeader[SysLang]}`;
				for (let iSectionsCurrent in this.Sections) {
					let oSection = this.Sections[iSectionsCurrent];
					// Departure
					if (this.Sections.length === 1 || (parseInt(iSectionsCurrent) === 0 && this.Sections.length > 1)){ 
						this.html = `${this.html}<tr><td>${oSection.StationFrom.customname}</td>`;						
					} else{
						this.html = `${this.html}<tr>`;
					} 
					// Time
					if (oSection.departureOnTime === true){ 
						this.html = `${this.html}<td align="center"><font color="green">${adapter.formatDate(new Date(oSection.departure), "hh:mm")}</font></td>`;
					} else if (oSection.departureDelayed === true){
						this.html = `${this.html}<td align="center"><font color="red">${adapter.formatDate(new Date(oSection.departure), "hh:mm")}</font></td>`;
					} else{
						this.html = `${this.html}<td align="center">${adapter.formatDate(new Date(oSection.departure), "hh:mm")}</td>`;
					}
					// platform
					if (oSection.StationFrom.platform === null){
						this.html = `${this.html}<td align="center">-</td>`;
					} else if (oSection.StationFrom.platform === oSection.StationFrom.platformplanned){ 
						this.html = `${this.html}<td align="center"><font color="green">${oSection.StationFrom.platform}</font></td>`;
					} else {
						this.html = `${this.html}<td align="center"><font color="red">${oSection.StationFrom.platform}</font></td>`;
					}
					// Delay
					let dDelay = Math.ceil(oSection.departureDelaySeconds / 60);
					if (oSection.departureOnTime === true){ 
						this.html = `${this.html}<td align="center"><font color="green">${dDelay}</font></td>`;
					} else if (this.departureDelayed === true){
						this.html = `${this.html}<td align="center"><font color="red">${dDelay}</font></td>`;
					} else{
						this.html = `${this.html}<td align="center">${dDelay}</td>`;
					}
					if (parseInt(iSectionsCurrent) === (parseInt(this.Sections.length.toString()) - 1)){ 
						this.html = `${this.html}</tr><tr><td>${oSection.StationTo.customname}</td>`;						
					} else{
						this.html = `${this.html}</tr><tr><td rowspan="2" valign="top">${oSection.StationTo.customname}</td>`;
					} 
					// Arrival
					// Time
					if (oSection.arrivalOnTime === true){ 
						this.html = `${this.html}<td align="center"><font color="green">${adapter.formatDate(new Date(oSection.arrival), "hh:mm")}</font></td>`;
					} else if (oSection.arrivalDelayed === true){
						this.html = `${this.html}<td align="center"><font color="red">${adapter.formatDate(new Date(oSection.arrival), "hh:mm")}</font></td>`;
					} else{
						this.html = `${this.html}<td align="center">${adapter.formatDate(new Date(oSection.arrival), "hh:mm")}</td>`;
					}
					// Platform
					if (oSection.StationTo.platform === null){
						this.html = `${this.html}<td align="center">-</td>`;
					} else if (oSection.StationTo.platform === oSection.StationTo.platformplanned){ 
						this.html = `${this.html}<td align="center"><font color="green">${oSection.StationTo.platform}</font></td>`;
					} else {
						this.html = `${this.html}<td align="center"><font color="red">${oSection.StationTo.platform}</font></td>`;
					}
					// Delay
					let aDelay = Math.ceil(oSection.arrivalDelaySeconds / 60);
					if (oSection.arrivalOnTime === true){ 
						this.html = `${this.html}<td align="center"><font color="green">${aDelay}</font></td>`;
					} else if (this.arrivalDelayed === true){
						this.html = `${this.html}<td align="center"><font color="red">${aDelay}</font></td>`;
					} else{
						this.html = `${this.html}<td align="center">${aDelay}</td>`;
					}
					this.html = `${this.html}</tr>`;
				}
				this.html = `${this.html}</table>`;
				await SetTextState(`${BasePath}.HTML`, "HTML", "HTML", this.html, "html");
			} else{
				await deleteObject(`${BasePath}.HTML`)
			} 
		} catch(e){
			throw new Error(`Exception in writeJourneyHTML [${e}]`);
		} 
	}	
}
//#endregion

//#region Class fRoute
class fRoute{
	constructor(){
		this.StationFrom = new fStation();
		this.StationTo = new fStation();
		this.StationVia = new fStation();
		this.Journeys = new Array();
		this.enabled = false;
		this.html = "";
		this.json = "";
		this.index = 0;
	}

	/**
	* Writes basic states for Route to ioBroker
	*/
	async writeBaseStates(){
		try {
			if (this.enabled === true) { 
				await SetChannel(this.index.toString(), `Route #${this.index.toString()} - ${this.StationFrom.name} - ${this.StationTo.name}`, "Route from Adapter configuration");
			}	
			await SetBoolState(`${this.index.toString()}.Enabled`, `Configuration State of Route #${this.index.toString()}`, "Route State from Adapter configuration", this.enabled);
		} catch (e){
			throw new Error(`Exception in writeBaseStates [${e}]`);
		}
	}

	/**
	* Writes states for Route to ioBroker
	*/
	async writeStates(){
		try {
			for (let iJourneysCurrent in this.Journeys) {
				this.Journeys[iJourneysCurrent].writeJourney(`${this.index}.${iJourneysCurrent}`, this.index, iJourneysCurrent);
			}
			await deleteUnusedConnections(this.index, this.Journeys.length);
		} catch (e){
			throw new Error(`Exception in writeStates [${e}]`);
		}
	}

	/**
	* Writes HTML for Route to ioBroker
	*/
	async writeHTML(){
		try {
			if (adapter.config.CreateHTML > 0){ 
				this.html = `<table><tr><th align="left" colspan="${adapter.config.CreateHTML + 1}">${this.StationFrom.customname} - ${this.StationTo.customname}</th></tr>`;
				for (let iJourneysCurrent in this.Journeys) {
					this.html = `${this.html}${this.Journeys[iJourneysCurrent].createHTML()}`;
				}
				this.html = `${this.html}</table>`;
				await SetTextState(`${this.index.toString()}.HTML`, "HTML", "HTML", this.html, "html");
			} else{
				await deleteObject(`${this.index.toString()}.HTML`)
			}
			// Create HTML states per Journey if configured
			for (let iJourneysCurrent in this.Journeys) {
				this.Journeys[iJourneysCurrent].writeJourneyHTML(`${this.index}.${iJourneysCurrent}`);
			}
		} catch (e){
			throw new Error(`Exception in writeStates [${e}]`);
		}
	}

	/**
	* Gets Route information from Website and extracts informations
	* @param {fRouteOptions} RouteOptions Single configuration entry for route
	*/
	async getRoute(RouteOptions){
		let aRouteResult = null;
		// RouteSearch
		try{
			adapter.log.silly(`Route #${this.index.toString()} FROM: ${this.StationFrom.id} TO: ${this.StationTo.id} ROUTEOPTIONS: ${RouteOptions.returnRouteOptions().toString()}`);
			aRouteResult = await hClient.journeys(this.StationFrom.id.toString(), this.StationTo.id.toString(), RouteOptions.returnRouteOptions());
			if (adapter.config.SaveJSON !== false){
				await SetTextState(`${this.index.toString()}.JSON`, "Route JSON", "Route JSON", JSON.stringify(aRouteResult), "json");
			} 
			adapter.log.silly(`Route #${this.index.toString()} ROUTE: ${JSON.stringify(aRouteResult)}`);
		} catch (e){
			throw new Error(`Exception in getRoute(RouteSearch) [${e}]`);
		} 
		// Iterating Journey results
		for (let iJourneysCurrent in aRouteResult.journeys) {
			let aConn = aRouteResult.journeys[iJourneysCurrent];
			adapter.log.silly(`Route #${this.index.toString()} Journey #${iJourneysCurrent}: ${JSON.stringify(aConn)}`);
			let CurrentJourney = new fJourney();
			CurrentJourney.StationFrom = this.StationFrom;
			CurrentJourney.StationTo = this.StationTo;
			CurrentJourney.parseJourney(aConn);
			await CurrentJourney.checkDelay(`${this.index}.${iJourneysCurrent}`, this.index);
			this.Journeys.push(CurrentJourney);
		}
	} 
} 
//#endregion

//#region Class fRouteOptions
class fRouteOptions{
	constructor(){
		this.results = 3;
		this.language = "de";
		this.remarks = true;
		this.via = "";
		this.transfers = -1;
		this.bycicles = false;
		this.products = null;
	}

	/**
	* Sets property products from configuration string
	* @param {string} Products Configured Products in Configuration of Adapter
	*/
	setProducts(Products){
		try{ 
			let aProducts = Products.split(",");
			if (!(aProducts.indexOf('all') > -1)){
				let aProductOption = {};
				switch(adapter.config.Provider){
					case "DB":
						aProductOption = hDBproducts;
						break;
					case "OEBB":
						aProductOption = hOEBBproducts;
						break;
				} 
				for (let i in aProducts){
					aProductOption[aProducts[i]] = true
				}
				this.products = aProductOption;
			}
		} catch (e){
			throw new Error(`Exception in setProducts [${e}]`);
		} 
	}

	/**
	* Returns Route Options for HAFAS in JSON
	*/
	returnRouteOptions(){
		try{ 
			let aRouteOptions = { results: this.results, language: this.language, remarks: this.remarks, departure: new Date() };
			if (this.via !== "") aRouteOptions["via"] = this.via;
			if (this.transfers >= 0) aRouteOptions["transfers"] = this.transfers;
			if (this.bycicles === true) aRouteOptions["bike"] = this.bycicles;
			if (this.products !== null) aRouteOptions["products"] = this.products;
			return aRouteOptions;
		} catch (e){
			throw new Error(`Exception in returnRouteOptions [${e}]`);
		} 	
	} 

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
			// Creating Route Object
			let Route = new fRoute();
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
				let RouteOptions = new fRouteOptions();
				RouteOptions.via = oRoute.station_via;
				if (oRoute.transfers >= 0) RouteOptions.transfers = parseInt(oRoute.transfers);
				RouteOptions.bycicles = oRoute.bycicles;
				RouteOptions.setProducts(oRoute.traintype.toString());
				adapter.log.silly(`Route #${iRouteIndex.toString()} ROUTEOPTIONS: ${JSON.stringify(RouteOptions.returnRouteOptions())}`);
				await Route.getRoute(RouteOptions);
				adapter.log.silly(`Route #${iRouteIndex.toString()} ROUTEOBJECT: ${JSON.stringify(Route)}`);
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
async function SetTextState(sStateName, sDisplayName, sDescription, sValue, sRole = "state"){
	try{ 
		await adapter.setObjectAsync(sStateName, {
			type: "state",
			common: {
				name: sDisplayName,
				type: "string",
				role: sRole,
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

//#region Helper Function SetNumState
/**
* Sets Numeric State
* @param {string} sStateName Name of the State
* @param {string} sDisplayName Displayed Name of the State
* @param {string} sDescription Description of the State
* @param {number} sValue Value of the State
*/
async function SetNumState(sStateName, sDisplayName, sDescription, sValue, sRole = "value"){
	try{ 
		await adapter.setObjectAsync(sStateName, {
			type: "state",
			common: {
				name: sDisplayName,
				type: "number",
				role: sRole,
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
		await adapter.setObjectAsync(sStateName,{
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
		let States = await adapter.getObjectAsync(`${iRoute.toString()}.${iConnection.toString()}.*`);
		let SectionRegEx = `${adapter.name}.${adapter.instance}.${iRoute.toString()}.${iConnection.toString()}.(\\d*).*$`;
		adapter.log.silly(`Delete Route #${iRoute} Connection #${iConnection} with max section # ${iSections} and regex:${SectionRegEx}`);	
		for (let State in States){
			let Searcher = State.toString().match(new RegExp(SectionRegEx));
			if (Searcher !== null){ 
				if (parseInt(Searcher[1]) > iSections ){
					await adapter.delObjectAsync(State);
				}
			}	
		} 
		adapter.getChannels((error, Channels) => {
			if (Channels && Channels !== null){ 
				for (let Channel of Channels){
					let Searcher = Channel["_id"].toString().match(new RegExp(SectionRegEx));
					if (Searcher !== null){ 
						if (parseInt(Searcher[1]) > iSections ){
							adapter.delObject(Channel["_id"]);
						}
					}	
				}
			}	
		});
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
		let States = await adapter.getObjectAsync(`${iRoute.toString()}.*`);
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
		adapter.getChannels((error, Channels) => {
			if (Channels && Channels !== null){ 
				for (let Channel of Channels){
					let Searcher = Channel["_id"].toString().match(new RegExp(SectionRegEx));
					if (Searcher !== null){ 
						if (parseInt(Searcher[1]) > iConnections ){
							adapter.delObject(Channel["_id"]);
						}
					}	
				}
			}	
		});
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