"use strict";

const fStation = require("./station.js");
const fJourney = require("./journey.js");

const sRouteHTMLHeader1 ={
	"en": '<tr><th align="center">Departure</th><th align="center">Arrival</th></tr>',
	"de": '<tr><th align="center">Abfahrt</th><th align="center">Ankunft</th></tr>',
	"ru": '<tr><th align="center">Вылет из</th><th align="center">Прибытие</th></tr>',
	"pt": '<tr><th align="center">Saída</th><th align="center">Chegada</th></tr>',
	"nl": '<tr><th align="center">Vertrek</th><th align="center">Aankomst</th></tr>',
	"fr": '<tr><th align="center">Départ</th><th align="center">Arrivée</th></tr>',
	"it": '<tr><th align="center">Partenza</th><th align="center">Arrivo</th></tr>',
	"es": '<tr><th align="center">Salida</th><th align="center">Llegada</th></tr>',
	"pl": '<tr><th align="center">wyjazd</th><th align="center">Przyjazd</th></tr>',
	"zh-cn": '<tr><th align="center">离开</th><th align="center">到达</th></tr>'
};
const sRouteHTMLHeader2 ={
	"en": '<tr><th align="center">Departure</th><th align="center">Delay</th><th align="center">Arrival</th><th align="center">Delay</th></tr>',
	"de": '<tr><th align="center">Abfahrt</th><th align="center">Verspätung</th><th align="center">Ankunft</th><th align="center">Verspätung</th></tr>',
	"ru": '<tr><th align="center">Вылет из</th><th align="center">задержка</th><th align="center">Прибытие</th><th align="center">задержка</th></tr>',
	"pt": '<tr><th align="center">Saída</th><th align="center">Demora</th><th align="center">Chegada</th><th align="center">Demora</th></tr>',
	"nl": '<tr><th align="center">Vertrek</th><th align="center">Vertraging</th><th align="center">Aankomst</th><th align="center">Vertraging</th></tr>',
	"fr": '<tr><th align="center">Départ</th><th align="center">Retard</th><th align="center">Arrivée</th><th align="center">Retard</th></tr>',
	"it": '<tr><th align="center">Partenza</th><th align="center">Ritardo</th><th align="center">Arrivo</th><th align="center">Ritardo</th></tr>',
	"es": '<tr><th align="center">Salida</th><th align="center">Retrasar</th><th align="center">Llegada</th><th align="center">Retrasar</th></tr>',
	"pl": '<tr><th align="center">wyjazd</th><th align="center">Opóźnienie</th><th align="center">Przyjazd</th><th align="center">Opóźnienie</th></tr>',
	"zh-cn": '<tr><th align="center">离开</th><th align="center">延迟</th><th align="center">到达</th><th align="center">延迟</th></tr>'
};
const sRouteHTMLHeader3 ={
	"en": '<tr><th align="center">Departure</th><th align="center">Delay</th><th align="center">Platform</th><th align="center">Arrival</th><th align="center">Delay</th><th align="center">Platform</th></tr>',
	"de": '<tr><th align="center">Abfahrt</th><th align="center">Verspätung</th><th align="center">Plattform</th><th align="center">Ankunft</th><th align="center">Verspätung</th><th align="center">Plattform</th></tr>',
	"ru": '<tr><th align="center">Вылет из</th><th align="center">задержка</th><th align="center">Платформа</th><th align="center">Прибытие</th><th align="center">задержка</th><th align="center">Платформа</th></tr>',
	"pt": '<tr><th align="center">Saída</th><th align="center">Demora</th><th align="center">Plataforma</th><th align="center">Chegada</th><th align="center">Demora</th><th align="center">Plataforma</th></tr>',
	"nl": '<tr><th align="center">Vertrek</th><th align="center">Vertraging</th><th align="center">Platform</th><th align="center">Aankomst</th><th align="center">Vertraging</th><th align="center">Platform</th></tr>',
	"fr": '<tr><th align="center">Départ</th><th align="center">Retard</th><th align="center">Plate-forme</th><th align="center">Arrivée</th><th align="center">Retard</th><th align="center">Plate-forme</th></tr>',
	"it": '<tr><th align="center">Partenza</th><th align="center">Ritardo</th><th align="center">piattaforma</th><th align="center">Arrivo</th><th align="center">Ritardo</th><th align="center">piattaforma</th></tr>',
	"es": '<tr><th align="center">Salida</th><th align="center">Retrasar</th><th align="center">Plataforma</th><th align="center">Llegada</th><th align="center">Retrasar</th><th align="center">Plataforma</th></tr>',
	"pl": '<tr><th align="center">wyjazd</th><th align="center">Opóźnienie</th><th align="center">Platforma</th><th align="center">Przyjazd</th><th align="center">Opóźnienie</th><th align="center">Platforma</th></tr>',
	"zh-cn": '<tr><th align="center">离开</th><th align="center">延迟</th><th align="center">平台</th><th align="center">到达</th><th align="center">延迟</th><th align="center">平台</th></tr>'
};

class fRoute{
	constructor(helper){
		this.helper = helper;
		this.StationFrom = new fStation(this.helper);
		this.StationTo = new fStation(this.helper);
		this.StationVia = new fStation(this.helper);
		this.Journeys = new Array();
		this.enabled = false;
		this.html = "";
		this.json = "";
		this.index = 0;
		this.NumDeps = 3;
		this.JourneysFound = true;
	}

	/**
	* Writes basic states for Route to ioBroker
	*/
	async writeBaseStates(){
		try {
			if (this.enabled === true) {
				await this.helper.SetChannel(this.index.toString(), `Route #${this.index.toString()} - ${this.StationFrom.name} - ${this.StationTo.name}`, "Route from Adapter configuration");
			}
			await this.helper.SetBoolState(`${this.index.toString()}.Enabled`, `Configuration State of Route #${this.index.toString()}`, "Route State from Adapter configuration", this.enabled);
		} catch (e){
			this.helper.ReportingError(e, `Exception in Route`, "fRoute", "writeBaseStates");
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Writes states for Route to ioBroker
	*/
	async writeStates(){
		try {
			for (const iJourneysCurrent in this.Journeys) {
				await this.Journeys[iJourneysCurrent].writeJourney(`${this.index}.${iJourneysCurrent}`, this.index, iJourneysCurrent);
			}
			//await this.helper.deleteUnusedConnections(this.index, this.Journeys.length);
			await this.helper.deleteUnusedConnections(this.index, this.NumDeps);
		} catch (e){
			this.helper.ReportingError(e, `Exception in Route`, "fRoute", "writeStates", "", {json: this.json} );
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Writes HTML for Route to ioBroker
	*/
	async writeHTML(){
		try {
			if (this.helper.Fahrplan.config.CreateHTML > 0){
				this.html = `<table width="100%"><tr><th align="left" colspan="${this.helper.Fahrplan.config.CreateHTML + 1}">${this.StationFrom.customname} - ${this.StationTo.customname}</th></tr>`;
				if (this.helper.Fahrplan.config.CreateHTMLHeadlines === 1){
					switch (this.helper.Fahrplan.config.CreateHTML){
						case 2:
							this.html = `${this.html}${sRouteHTMLHeader2[this.helper.Fahrplan.SysLang]}`;
							break;
						case 3:
							this.html = `${this.html}${sRouteHTMLHeader3[this.helper.Fahrplan.SysLang]}`;
							break;
						default:
							this.html = `${this.html}${sRouteHTMLHeader1[this.helper.Fahrplan.SysLang]}`;
							break;
					}
				}
				for (const iJourneysCurrent in this.Journeys) {
					this.html = `${this.html}${this.Journeys[iJourneysCurrent].createHTML()}`;
				}
				this.html = `${this.html}</table>`;
				await this.helper.SetTextState(`${this.index.toString()}.HTML`, "HTML", "HTML", this.html, "html");
			} else{
				await this.helper.deleteObject(`${this.index.toString()}.HTML`);
			}
			// Create HTML states per Journey if configured
			for (const iJourneysCurrent in this.Journeys) {
				this.Journeys[iJourneysCurrent].writeJourneyHTML(`${this.index}.${iJourneysCurrent}`);
			}
		} catch (e){
			this.helper.ReportingError(e, `Exception in Route`, "fRoute", "writeHTML", "", {json: this.json} );
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Gets Route information from Website and extracts informations
	* @typedef {import('./options')} fOptions
	* @param {fOptions} RouteOptions Single configuration entry for route
	*/
	async getRoute(RouteOptions){
		let aRouteResult = null;
		// RouteSearch
		try{
			this.helper.ReportingInfo("Debug", "Route", `Executing HAFAS search for Route #${this.index.toString()}`, "fRoute", "getRoute", "RouteSearch", JSON.stringify(RouteOptions.returnRouteOptions()));
			aRouteResult = await this.helper.hClient.journeys(this.StationFrom.id.toString(), this.StationTo.id.toString(), RouteOptions.returnRouteOptions());
			this.json = JSON.stringify(aRouteResult);
			this.helper.ReportingInfo("Debug", "Route", `Result received for Route #${this.index.toString()}: ${JSON.stringify(aRouteResult)}`, "fRoute", "getRoute", "RouteSearch", JSON.stringify(aRouteResult));
			if (this.helper.Fahrplan.config.SaveJSON !== false){
				await this.helper.SetTextState(`${this.index.toString()}.JSON`, "Route JSON", "Route JSON", JSON.stringify(aRouteResult), "json");
			}
		} catch (e){
			if (e.hafasErrorCode === "H890"){
				this.helper.Fahrplan.log.error(`No journeys found for route ${this.index} (HAFAS-Error H890)`);
				this.JourneysFound = false;
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
				this.JourneysFound = false;
			} else if (e.name === "TypeError" && e.stack.includes("at applyRemarks") === true){
				// See issue: https://github.com/public-transport/hafas-client/issues/196
				this.helper.Fahrplan.log.error(`Unknown error to HAFAS (${e.message})`);
				this.JourneysFound = false;
			}else{
				this.helper.ReportingError(e, `Exception in Route`, "fRoute", "getRoute", "RouteSearch");
				throw this.helper.ErrorCustom("HANDLED");
			}
		}
		// Iterating Journey results
		try{
			if (this.JourneysFound === true){
				for (const iJourneysCurrent in aRouteResult.journeys) {
					if (parseInt(iJourneysCurrent) < this.NumDeps){
						const aConn = aRouteResult.journeys[iJourneysCurrent];
						this.helper.ReportingInfo("Debug", "Route", `Route #${this.index.toString()} running on Journey #${iJourneysCurrent}: ${JSON.stringify(aConn)}`, "fRoute", "getRoute", "Iteration", JSON.stringify(aConn));
						const CurrentJourney = new fJourney(this.helper);
						CurrentJourney.StationFrom = this.StationFrom;
						CurrentJourney.StationTo = this.StationTo;
						CurrentJourney.parseJourney(aConn);
						await CurrentJourney.checkDelay(`${this.index}.${iJourneysCurrent}`, this.index);
						this.Journeys.push(CurrentJourney);
					}
				}
			}
		}catch (e) {
			this.helper.ReportingError(e, `Exception in Route`, "fRoute", "getRoute", "Iteration", {json: this.json});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}
}

module.exports = fRoute;