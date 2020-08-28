"use strict";

const fStation = require("./station.js");
const fJourney = require("./journey.js");

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
			throw new Error(`Exception in fRoute/writeBaseStates [${e}]`);
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
			await this.helper.deleteUnusedConnections(this.index, this.Journeys.length);
		} catch (e){
			throw new Error(`Exception in fRoute/writeStates [${e}]`);
		}
	}

	/**
	* Writes HTML for Route to ioBroker
	*/
	async writeHTML(){
		try {
			if (this.helper.Fahrplan.config.CreateHTML > 0){ 
				this.html = `<table><tr><th align="left" colspan="${this.helper.Fahrplan.config.CreateHTML + 1}">${this.StationFrom.customname} - ${this.StationTo.customname}</th></tr>`;
				for (let iJourneysCurrent in this.Journeys) {
					this.html = `${this.html}${this.Journeys[iJourneysCurrent].createHTML()}`;
				}
				this.html = `${this.html}</table>`;
				await this.helper.SetTextState(`${this.index.toString()}.HTML`, "HTML", "HTML", this.html, "html");
			} else{
				await this.helper.deleteObject(`${this.index.toString()}.HTML`)
			}
			// Create HTML states per Journey if configured
			for (let iJourneysCurrent in this.Journeys) {
				this.Journeys[iJourneysCurrent].writeJourneyHTML(`${this.index}.${iJourneysCurrent}`);
			}
		} catch (e){
			throw new Error(`Exception in fRoute/writeStates [${e}]`);
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
			this.helper.Fahrplan.log.silly(`Route #${this.index.toString()} FROM: ${this.StationFrom.id} TO: ${this.StationTo.id} ROUTEOPTIONS: ${RouteOptions.returnRouteOptions().toString()}`);
			aRouteResult = await this.helper.hClient.journeys(this.StationFrom.id.toString(), this.StationTo.id.toString(), RouteOptions.returnRouteOptions());
            this.helper.Fahrplan.log.silly(`Route #${this.index.toString()} ROUTE: ${JSON.stringify(aRouteResult)}`);
            if (this.helper.Fahrplan.config.SaveJSON !== false){
				await this.helper.SetTextState(`${this.index.toString()}.JSON`, "Route JSON", "Route JSON", JSON.stringify(aRouteResult), "json");
			} 
		} catch (e){
			throw new Error(`Exception in fRoute/getRoute(RouteSearch) [${e}]`);
		} 
        // Iterating Journey results
        try{ 
            for (let iJourneysCurrent in aRouteResult.journeys) {
                let aConn = aRouteResult.journeys[iJourneysCurrent];
                this.helper.Fahrplan.log.silly(`Route #${this.index.toString()} Journey #${iJourneysCurrent}: ${JSON.stringify(aConn)}`);
                let CurrentJourney = new fJourney(this.helper);
                CurrentJourney.StationFrom = this.StationFrom;
                CurrentJourney.StationTo = this.StationTo;
                CurrentJourney.parseJourney(aConn);
                await CurrentJourney.checkDelay(`${this.index}.${iJourneysCurrent}`, this.index);
                this.Journeys.push(CurrentJourney);
            }
        }catch (e) {
            throw new Error(`Exception in fRoute/getRoute(Iteration) [${e}]`);
        } 
	} 
} 

module.exports = fRoute