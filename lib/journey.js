"use strict";

const fStation = require("./station.js");
const fSection = require("./section.js");

// Language specific Header for HTML journey output
const sJourneyHTMLHeader ={
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
};

class fJourney{
	constructor(helper){
		this.helper = helper;
		this.Sections = new Array();
		this.StationFrom = new fStation(helper);
		this.StationTo = new fStation(helper);
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
			// eslint-disable-next-line no-unused-vars
			for (const _iSectionCurrent in Journey.legs ) {
				iCounterSection++;
			}
			iCounterSection--;
			this.changes = iCounterSection;
			for (const iSectionCurrent in Journey.legs ) {
				const aConnSub = Journey.legs[iSectionCurrent];
				// Create current section object
				const CurrSection = new fSection(this.helper);
				CurrSection.json = JSON.stringify(aConnSub);
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
					if (aConnSub.departureDelay === 0 && aConnSub.departureDelay < (this.helper.Fahrplan.config.DelayTime * 60)){
						CurrSection.departureOnTime = true;
					} else if (aConnSub.departureDelay >= (this.helper.Fahrplan.config.DelayTime * 60)){
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
					if (aConnSub.arrivalDelay === 0 && aConnSub.arrivalDelay < (this.helper.Fahrplan.config.DelayTime * 60)){
						CurrSection.arrivalOnTime = true;
					} else if (aConnSub.arrivalDelay >= (this.helper.Fahrplan.config.DelayTime * 60)){
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
			this.helper.ErrorReporting(e, `Exception in Journey`, "fJourney", "parseJourney", "", {json: Journey});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Checks Journey for delays
	* @param {string} BasePath Path to channel with journey information
	* @param {number} RouteIndex Index number of Route
	*/
	async checkDelay(BasePath, RouteIndex){
		try {
			const ConfigDelays = this.helper.Fahrplan.config.delays||[];
			const RouteDelays = ConfigDelays.filter(delay=>delay.route===RouteIndex.toString() && delay.enabled===true && delay.notistart !== "");
			if (RouteDelays.length > 0) this.helper.Fahrplan.log.silly(`Configured Delays for Route #${RouteIndex}: ${JSON.stringify(RouteDelays)}`);
			for (const iRouteDelayCurrent in RouteDelays ) {
				const RouteDelay = RouteDelays[iRouteDelayCurrent];
				if ((RouteDelay.departplan === "" || RouteDelay.departplan === this.helper.Fahrplan.formatDate(new Date(this.departure), "hh:mm")) && ( RouteDelay.days.includes("7") || RouteDelay.days.includes(new Date(this.departure).getDay().toString()))){
					const NotiStartTime = new Date(this.departurePlanned);
					NotiStartTime.setMinutes(NotiStartTime.getMinutes() - parseInt(RouteDelay.notistart));
					if (new Date() >= new Date(NotiStartTime) && new Date() <= new Date(this.departure) ){
						// this.departureDelaySeconds = 180;
						if (this.departureDelaySeconds !== 0 && this.departureDelaySeconds >= (this.helper.Fahrplan.config.DelayTime * 60)){
							const OldNotifyValue = await this.helper.Fahrplan.getStateAsync(`${BasePath}.NotifyValue`);
							this.helper.Fahrplan.log.silly(`OldNotifyValue: ${JSON.stringify(OldNotifyValue)} `);
							if (OldNotifyValue === null || !OldNotifyValue || (OldNotifyValue !== null && OldNotifyValue && OldNotifyValue.val !== null && parseInt(this.departureDelaySeconds.toString()) !== parseInt(OldNotifyValue.val.toString()))){
								this.notify = true;
								this.notifyValue = this.departureDelaySeconds;
								this.notifyText = await this.buildDelayNotification();
								this.helper.Fahrplan.log.silly(`DELAY NOTIFICATION: ${this.notifyText}`);
								if (RouteDelay.output_id !== ""){
									// Buidling output string
									await this.helper.Fahrplan.setForeignStateAsync(RouteDelay.output_id, this.notifyText);
								}
							}
						}
					}
				}
			}
		} catch(e) {
			this.helper.ErrorReporting(e, `Exception in Journey`, "fJourney", "checkDelay", "", {json: this.json});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Build delay string output
	*/
	async buildDelayNotification(){
		try{
			let sOut = "";
			switch (this.helper.Fahrplan.SysLang){
				case "de":
					sOut = `Verbindung von ${this.StationFrom.customname} nach ${this.StationTo.customname}, geplante Abfahrt ${this.helper.Fahrplan.formatDate(new Date(this.departurePlanned), "hh:mm")} verspätet sich um ${Math.ceil(this.departureDelaySeconds / 60)} Minuten`;
					break;
				default:
					sOut = `Connection from ${this.StationFrom.customname} to ${this.StationTo.customname} with planned departure ${this.helper.Fahrplan.formatDate(new Date(this.departurePlanned), "hh:mm")} is ${Math.ceil(this.departureDelaySeconds / 60)} minutes late`;
					break;
			}
			return sOut;
		} catch(e){
			this.helper.ErrorReporting(e, `Exception in Journey`, "fJourney", "buildDelayNotification", "", {json: this.json});
			throw this.helper.ErrorCustom("HANDLED");
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
			await this.helper.SetChannel(`${BasePath}`, `Connection ${this.StationFrom.name} - ${this.StationTo.name}`, `Connection`);
			if (this.helper.Fahrplan.config.SaveJSON !== false){
				await this.helper.SetTextState(`${BasePath}.JSON`, "Journey JSON", "Journey JSON", this.json, "json");
			}
			if (this.helper.Fahrplan.config.SaveObjects === 1){
				await this.helper.deleteUnusedSections(RouteIndex, JourneyIndex, -1);
			}
			if (this.helper.Fahrplan.config.SaveObjects >= 1){
				await this.helper.SetNumState(`${BasePath}.Changes`, "Changes", "Changes", this.changes);
				await this.helper.SetBoolState(`${BasePath}.TransfersReachable`, "TransfersReachable", "TransfersReachable", this.transfersReachable);
				// Overall Departure Values
				await this.helper.SetNumState(`${BasePath}.Departure`, "Departure", "Departure", (new Date(this.departure)).getTime(), "date");
				await this.helper.SetNumState(`${BasePath}.DeparturePlanned`, "DeparturePlanned", "DeparturePlanned", (new Date(this.departurePlanned)).getTime(), "date");
				await this.helper.SetNumState(`${BasePath}.DepartureDelaySeconds`, "DepartureDelaySeconds", "DepartureDelaySeconds", this.departureDelaySeconds);
				await this.helper.SetBoolState(`${BasePath}.DepartureOnTime`, "DepartureOnTime", "DepartureOnTime", this.departureOnTime);
				await this.helper.SetBoolState(`${BasePath}.DepartureDelayed`, "DepartureDelayed", "DepartureDelayed", this.departureDelayed);
				// Overall Arrival Values
				await this.helper.SetNumState(`${BasePath}.Arrival`, "Arrival", "Arrival", (new Date(this.arrival)).getTime(), "date");
				await this.helper.SetNumState(`${BasePath}.ArrivalPlanned`, "ArrivalPlanned", "ArrivalPlanned", (new Date(this.arrivalPlanned)).getTime(), "date");
				await this.helper.SetNumState(`${BasePath}.ArrivalDelaySeconds`, "ArrivalDelaySeconds", "ArrivalDelaySeconds", this.arrivalDelaySeconds);
				await this.helper.SetBoolState(`${BasePath}.ArrivalOnTime`, "ArrivalOnTime", "ArrivalOnTime", this.arrivalOnTime);
				await this.helper.SetBoolState(`${BasePath}.ArrivalDelayed`, "ArrivalDelayed", "ArrivalDelayed", this.arrivalDelayed);
				// Notification Information
				await this.helper.SetBoolState(`${BasePath}.Notify`, "Notify", "Notify", this.notify);
				await this.helper.SetNumState(`${BasePath}.NotifyValue`, "NotifyValue", "NotifyValue", this.notifyValue);
				await this.helper.SetTextState(`${BasePath}.NotifyText`, "NotifyText", "NotifyText", this.notifyText);
				// Duration
				const DepartureDate = (new Date(this.departure)).getTime();
				const ArrivalDate = (new Date(this.arrival)).getTime();
				const Duration = Math.round((((ArrivalDate - DepartureDate) % 86400000) % 3600000) / 60000); // minutes
				await this.helper.SetNumState(`${BasePath}.Duration`, "Duration", "Duration", Duration);
			}
			if (this.helper.Fahrplan.config.SaveObjects >= 2){
				for (const iSectionsCurrent in this.Sections) {
					this.Sections[iSectionsCurrent].writeSection(`${BasePath}.${iSectionsCurrent}`);
				}
				await this.helper.deleteUnusedSections(RouteIndex, JourneyIndex, this.Sections.length - 1);
			}
			if (this.helper.Fahrplan.config.SaveObjects === 0) {
				await this.helper.deleteUnusedSections(RouteIndex, JourneyIndex, -1);
				await this.helper.deleteObject(`${BasePath}.Changes`);
				await this.helper.deleteObject(`${BasePath}.TransfersReachable`);
				await this.helper.deleteObject(`${BasePath}.Departure`);
				await this.helper.deleteObject(`${BasePath}.DeparturePlanned`);
				await this.helper.deleteObject(`${BasePath}.DepartureDelaySeconds`);
				await this.helper.deleteObject(`${BasePath}.DepartureOnTime`);
				await this.helper.deleteObject(`${BasePath}.DepartureDelayed`);
				await this.helper.deleteObject(`${BasePath}.Arrival`);
				await this.helper.deleteObject(`${BasePath}.ArrivalPlanned`);
				await this.helper.deleteObject(`${BasePath}.ArrivalDelaySeconds`);
				await this.helper.deleteObject(`${BasePath}.ArrivalOnTime`);
				await this.helper.deleteObject(`${BasePath}.ArrivalDelayed`);
			}
		} catch(e) {
			this.helper.ErrorReporting(e, `Exception in Journey`, "fJourney", "writeJourney", "", {json: this.json});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/*
	* Creates HTML table column with HTML
	*/
	createHTML(){
		try{
			// adapter.formatDate(new Date(aConnSub.departure), "hh:mm")
			let sHTML = "<tr>";
			// Departure Time
			if (this.departureOnTime === true){
				sHTML = `${sHTML}<td><font color="green">${this.helper.Fahrplan.formatDate(new Date(this.departure), "hh:mm")}</font></td>`;
			} else if (this.departureDelayed === true){
				sHTML = `${sHTML}<td><font color="red">${this.helper.Fahrplan.formatDate(new Date(this.departure), "hh:mm")}</font></td>`;
			} else{
				sHTML = `${sHTML}<td>${this.helper.Fahrplan.formatDate(new Date(this.departure), "hh:mm")}</td>`;
			}
			// Departure delay time
			if (this.helper.Fahrplan.config.CreateHTML >= 2){
				const Delay = Math.ceil(this.departureDelaySeconds / 60);
				if (this.departureOnTime === true){
					sHTML = `${sHTML}<td><font color="green">${Delay}</font></td>`;
				} else if (this.departureDelayed === true){
					sHTML = `${sHTML}<td><font color="red">${Delay}</font></td>`;
				} else{
					sHTML = `${sHTML}<td>${Delay}</td>`;
				}
			}
			// Departure platform
			if (this.helper.Fahrplan.config.CreateHTML >= 3){
				if (this.StationFrom.platform === this.StationFrom.platformplanned){
					sHTML = `${sHTML}<td><font color="green">${this.StationFrom.platform}</font></td>`;
				} else {
					sHTML = `${sHTML}<td><font color="red">${this.StationFrom.platform}</font></td>`;
				}
			}
			// Arrival Time
			if (this.arrivalOnTime === true){
				sHTML = `${sHTML}<td><font color="green">${this.helper.Fahrplan.formatDate(new Date(this.arrival), "hh:mm")}</font></td>`;
			} else if (this.arrivalDelayed === true){
				sHTML = `${sHTML}<td><font color="red">${this.helper.Fahrplan.formatDate(new Date(this.arrival), "hh:mm")}</font></td>`;
			} else{
				sHTML = `${sHTML}<td>${this.helper.Fahrplan.formatDate(new Date(this.arrival), "hh:mm")}</td>`;
			}
			// Arrival delay time
			if (this.helper.Fahrplan.config.CreateHTML >= 2){
				const Delay = Math.ceil(this.arrivalDelaySeconds / 60);
				if (this.arrivalOnTime === true){
					sHTML = `${sHTML}<td><font color="green">${Delay}</font></td>`;
				} else if (this.arrivalDelayed === true){
					sHTML = `${sHTML}<td><font color="red">${Delay}</font></td>`;
				} else{
					sHTML = `${sHTML}<td>${Delay}</td>`;
				}
			}
			// Arrival platform
			if (this.helper.Fahrplan.config.CreateHTML >= 3){
				if (this.StationTo.platform === this.StationTo.platformplanned){
					sHTML = `${sHTML}<td><font color="green">${this.StationTo.platform}</font></td>`;
				} else {
					sHTML = `${sHTML}<td><font color="red">${this.StationTo.platform}</font></td>`;
				}
			}
			sHTML = `${sHTML}</tr>`;
			return sHTML;
		} catch(e){
			this.helper.ErrorReporting(e, `Exception in Journey`, "fJourney", "createHTML", "", {json: this.json});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Creates and saves HTML per Journey
	* @param {string} BasePath Path to channel with journey information
	*/
	async writeJourneyHTML(BasePath){
		try {
			if (this.helper.Fahrplan.config.CreateHTMLJourney >= 1){
				this.html = `<table><tr><th align="left" colspan="4">${this.StationFrom.customname} - ${this.StationTo.customname}</th></tr>`;
				if (this.helper.Fahrplan.config.CreateHTMLHeadlines === 1){
					this.html = `${this.html}${sJourneyHTMLHeader[this.helper.Fahrplan.SysLang]}`;
				}
				for (const iSectionsCurrent in this.Sections) {
					const oSection = this.Sections[iSectionsCurrent];
					// Departure
					if (this.Sections.length === 1 || (parseInt(iSectionsCurrent) === 0 && this.Sections.length > 1)){
						this.html = `${this.html}<tr><td>${oSection.StationFrom.customname}</td>`;
					} else{
						this.html = `${this.html}<tr>`;
					}
					// Time
					if (oSection.departureOnTime === true){
						this.html = `${this.html}<td align="center"><font color="green">${this.helper.Fahrplan.formatDate(new Date(oSection.departure), "hh:mm")}</font></td>`;
					} else if (oSection.departureDelayed === true){
						this.html = `${this.html}<td align="center"><font color="red">${this.helper.Fahrplan.formatDate(new Date(oSection.departure), "hh:mm")}</font></td>`;
					} else{
						this.html = `${this.html}<td align="center">${this.helper.Fahrplan.formatDate(new Date(oSection.departure), "hh:mm")}</td>`;
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
					const dDelay = Math.ceil(oSection.departureDelaySeconds / 60);
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
						this.html = `${this.html}<td align="center"><font color="green">${this.helper.Fahrplan.formatDate(new Date(oSection.arrival), "hh:mm")}</font></td>`;
					} else if (oSection.arrivalDelayed === true){
						this.html = `${this.html}<td align="center"><font color="red">${this.helper.Fahrplan.formatDate(new Date(oSection.arrival), "hh:mm")}</font></td>`;
					} else{
						this.html = `${this.html}<td align="center">${this.helper.Fahrplan.formatDate(new Date(oSection.arrival), "hh:mm")}</td>`;
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
					const aDelay = Math.ceil(oSection.arrivalDelaySeconds / 60);
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
				await this.helper.SetTextState(`${BasePath}.HTML`, "HTML", "HTML", this.html, "html");
			} else{
				await this.helper.deleteObject(`${BasePath}.HTML`);
			}
		} catch(e){
			this.helper.ErrorReporting(e, `Exception in Journey`, "fJourney", "writeJourneyHTML", "", {json: this.json});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}
}

module.exports = fJourney;