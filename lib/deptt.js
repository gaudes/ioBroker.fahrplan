"use strict";

const fStation = require("./station.js");
const fDepTTDep = require("./depttdep.js");
// eslint-disable-next-line no-unused-vars
const fOptions = require("./options");

// Language specific Header for HTML Departures output
const sDepartureHTMLHeader ={
	"en": '<tr><th align="center">Time</th><th align="left">Direction</th><th align="center">Platform</th><th align="center">Delay</th><th align="center">Type</th></tr>',
	"de": '<tr><th align="center">Zeit</th><th align="left">Richtung</th><th align="center">Plattform</th><th align="center">Verspätung</th><th align="center">Typ</th></tr>',
	"ru": '<tr><th align="center">Время</th><th align="left">Направление</th><th align="center">Платформа</th><th align="center">задержка</th><th align="center">тип</th></tr>',
	"pt": '<tr><th align="center">Tempo</th><th align="left">Direção</th><th align="center">Plataforma</th><th align="center">Demora</th><th align="center">tipo</th></tr>',
	"nl": '<tr><th align="center">Tijd</th><th align="left">Richting</th><th align="center">Platform</th><th align="center">Vertraging</th><th align="center">type</th></tr>',
	"fr": '<tr><th align="center">Temps</th><th align="left">Direction</th><th align="center">Plate-forme</th><th align="center">Retard</th><th align="center">type</th></tr>',
	"it": '<tr><th align="center">Tempo</th><th align="left">Direzione</th><th align="center">piattaforma</th><th align="center">Ritardo</th><th align="center">genere</th></tr>',
	"es": '<tr><th align="center">Hora</th><th align="left">Dirección</th><th align="center">Plataforma</th><th align="center">Retrasar</th><th align="center">tipo</th></tr>',
	"pl": '<tr><th align="center">Czas</th><th align="left">Kierunek</th><th align="center">Platforma</th><th align="center">Opóźnienie</th><th align="center">rodzaj</th></tr>',
	"zh-cn": '<tr><th align="center">时间</th><th align="left">方向</th><th align="center">平台</th><th align="center">延迟</th><th align="center">类型</th></tr>'
};

class fDepTT{
	constructor(helper){
		this.helper = helper;
		this.StationFrom = new fStation(this.helper);
		this.Departures = new Array();
		this.enabled = false;
		this.NumDeps = 3;
		this.DepsOffsetMin = 0;
		this.html = "";
		this.json = "";
		this.index = 0;
		this.DepTTFound = true;
	}

	/**
	* Gets departure timetable information from Website and extracts informations
	* @param {fOptions} DepTTOptions Single configuration entry for route
	*/
	async getDepTT(DepTTOptions){
		let aDepTTResult = null;
		// RouteSearch
		try{
			this.helper.ReportingInfo("Debug", "Departure Timetable", `Executing HAFAS search for Departure Timetable #${this.index.toString()}`, "fDepTT", "getDepTT", "Get", JSON.stringify(DepTTOptions.returnDepTTOptions()));
			aDepTTResult = await this.helper.hClient.departures(this.StationFrom.id.toString(), DepTTOptions.returnDepTTOptions());
			this.json = JSON.stringify(aDepTTResult);
			this.helper.ReportingInfo("Debug", "Departure Timetable", `Result received for Departure Timetable #${this.index.toString()}: ${JSON.stringify(aDepTTResult)}`, "fDepTT", "getDepTT", "Get", JSON.stringify(aDepTTResult));
			if (this.helper.Fahrplan.config.SaveJSON !== false){
				await this.helper.SetTextState(`DepartureTimetable${this.index.toString()}.JSON`, "Departure Timetable JSON", "Departure Timetable JSON", JSON.stringify(aDepTTResult), "json");
			}
		} catch (e) {
			if (e.hafasErrorCode === "H890"){
				this.helper.Fahrplan.log.error(`No departures found for Departure Timetable ${this.index} (HAFAS-Error H890)`);
				this.DepTTFound = false;
			} else if (e.isHafasError === true){
				this.helper.Fahrplan.log.error(`Error at HAFAS (${e.message})`);
				this.JourneysFound = false;
			} else if ( e.code === "EAI_AGAIN" ||
						e.name === "FetchError" ||
						e.code === "CGI_READ_FAILED" ||
						e.message === "HCI Service: request failed" ||
						e.message === "HCI Service: problems during service execution" ||
						e.message === "Bad Gateway" ||
						e.message === "Gateway Timeout" ||
						e.message === "Gateway Time-out"){
				this.helper.Fahrplan.log.error(`Connection error to HAFAS (${e.message})`);
				this.DepTTFound = false;
			}else{
				this.helper.ReportingError(e, `Exception in Departure Timetable ${this.index}`, "fDepTT", "getDepTT", "Get");
				throw this.helper.ErrorCustom("HANDLED");
			}
		}
		// Iterating through results
		try{
			if (this.DepTTFound === true){
				for (const iDeparturesCurrent in aDepTTResult) {
					const aConn = aDepTTResult[iDeparturesCurrent];
					const CurrentDep = new fDepTTDep(this.helper);
					// CurrentDep.StationFrom = this.StationFrom;
					CurrentDep.parse(aConn);
					this.Departures.push(CurrentDep);
				}
			}
		}catch (e) {
			this.helper.ReportingError(e, `Exception in Departure Timetable ${this.index}`, "fDepTT", "getDepTT", "Iteration", {json: aDepTTResult} );
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Writes basic states for Departure Timetable to ioBroker
	*/
	async writeBaseStates(){
		try {
			if (this.enabled === true) {
				await this.helper.SetChannel(`DepartureTimetable${this.index.toString()}`, `Departure Timetable #${this.index.toString()} - ${this.StationFrom.customname}`, "Departure Timetable from Adapter configuration");
			}
			await this.helper.SetBoolState(`DepartureTimetable${this.index.toString()}.Enabled`, `Configuration State of Departure Timetable #${this.index.toString()}`, "Departure Timetable State from Adapter configuration", this.enabled);
		} catch (e){
			this.helper.ReportingError(e, `Exception in Departure Timetable ${this.index}`, "fDepTT", "writeBaseStates");
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Writes states for Departure Timetable to ioBroker
	*/
	async writeStates(){
		try {
			for (const iDeparturesCurrent in this.Departures) {
				this.Departures[iDeparturesCurrent].write(`DepartureTimetable${this.index}.${iDeparturesCurrent}`, this.index, iDeparturesCurrent);
			}
			await this.helper.deleteUnusedDepartures(this.index, this.Departures.length);
		} catch (e){
			this.helper.ReportingError(e, `Exception in Departure Timetable ${this.index}`, "fDepTT", "writeStates", "", {json: this.json});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Writes HTML for Departure Timetable to ioBroker
	*/
	async writeHTML(){
		try {
			this.html = `<table><tr><th align="left" colspan="5">${this.StationFrom.customname}</th></tr>`;
			this.html = `${this.html}${sDepartureHTMLHeader[this.helper.Fahrplan.SysLang]}`;
			for (const iDeparturesCurrent in this.Departures) {
				this.html = `${this.html}${this.Departures[iDeparturesCurrent].createHTML()}`;
			}
			this.html = `${this.html}</table>`;
			await this.helper.SetTextState(`DepartureTimetable${this.index.toString()}.HTML`, "HTML", "HTML", this.html, "html");
		} catch (e){
			this.helper.ReportingError(e, `Exception in Departure Timetable ${this.index}`, "fDepTT", "writeHTML", "", {json: this.json});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}
}

module.exports = fDepTT;
