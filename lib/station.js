"use strict";

class fStation{
	constructor(helper){
		this.helper = helper;
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
			aResult = await this.helper.hClient.locations(eBhf);
			this.json = JSON.stringify(aResult);
			if (aResult.length === 1){
				this.id = aResult[0].id;
				this.name = aResult[0].name;
				this.type = aResult[0]["type"];
			} else {
				throw new Error(`Multiple results found for station ${eBhf}`);
			}
		} catch(e) {
			if (e.hafasErrorCode === "H890"){
				this.helper.Fahrplan.log.error(`No station ${this.id} found (HAFAS-Error H890)`);
				this.DepTTFound = false;
			} else if (e.isHafasError === true){
				this.helper.ReportingError(e, `HAFAS error in Station`, "fStation", "getStation", "", {json: eBhf, hafas: {request: e.request, url: e.url, statusCode: e.statusCode, code: e.code, responseId: e.responseId} });
				// this.helper.Fahrplan.log.error(`Error at HAFAS (${e.message})`);
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
				this.helper.ReportingError(e, `Exception in Station`, "fStation", "getStation", "", {json: eBhf});
				throw this.helper.ErrorCustom("HANDLED");
			}
		}
	}

	/**
	* Verify Station exists from HAFAS
	* @param {number} eBhf Numeric ID for station
	*/
	async verifyStation(eBhf){
		let aResult = null;
		try {
			aResult = await this.helper.hClient.stop(eBhf);
			this.json = JSON.stringify(aResult);
			if (aResult.id === eBhf){
				return true;
			} else {
				return false;
			}
		} catch(e) {
			if (e.isHafasError === true){
				this.helper.ReportingError(e, `HAFAS error in Station`, "fStation", "verifyStation", "", {json: eBhf, hafas: {request: e.request, url: e.url, statusCode: e.statusCode, code: e.code, responseId: e.responseId} });
			}
			return false;
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
			this.helper.ReportingError(e, `Exception in Station`, "fStation", "setStation", "", {json: Station});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Writes Station information to ioBroker
	* @param {string} BasePath Path to channel with station information
	* @param {string} BaseDesc Base Description
	*/
	async writeStation(BasePath, BaseDesc){
		try {
			await this.helper.SetChannel(`${BasePath}`, this.name, `${BaseDesc}`);
			await this.helper.SetTextState(`${BasePath}.Name`, `${BaseDesc} Name`, `${BaseDesc} Name`, this.name);
			if (this.id === null){
				await this.helper.SetTextState(`${BasePath}.eBhf`, `${BaseDesc} eBhf`, `${BaseDesc} eBhf`, "");
			} else {
				await this.helper.SetTextState(`${BasePath}.eBhf`, `${BaseDesc} eBhf`, `${BaseDesc} eBhf`, this.id.toString());
			}
			await this.helper.SetTextState(`${BasePath}.CustomName`, `${BaseDesc} Custom Name`, `${BaseDesc} Custom Name`, this.customname);
			await this.helper.SetTextState(`${BasePath}.Type`, `${BaseDesc} Type`, `${BaseDesc} Type`, this.type);
			if (this.platform !== null) await this.helper.SetTextState(`${BasePath}.Platform`, `${BaseDesc} Platform`, `${BaseDesc} Platform`, this.platform);
			if (this.platformplanned !== null) await this.helper.SetTextState(`${BasePath}.PlatformPlanned`, `${BaseDesc} PlatformPlanned`, `${BaseDesc} PlatformPlanned`, this.platformplanned);
			if (this.helper.Fahrplan.config.SaveJSON !== false){
				await this.helper.SetTextState(`${BasePath}.JSON`, `${BaseDesc} JSON`, `${BaseDesc} JSON`, this.json, "json");
			}
		} catch(e) {
			this.helper.ReportingError(e, `Exception in Station`, "fStation", "writeStation", "", {json: this.json});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}
}

module.exports = fStation;