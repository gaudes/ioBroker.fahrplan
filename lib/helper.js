"use strict";
import fStation from "./station.js";

export default class fHelpers{

	//#region Constructor
	/**
	 * @param Fahrplan this-Object from Base-Class
	 */
	constructor(Fahrplan){
		this.Fahrplan = Fahrplan;
		this.hClient = null;
		this.hProfile = null;
		this.isUnloaded = false;
		// Init Sentry
		if (this.Fahrplan.supportsFeature && this.Fahrplan.supportsFeature("PLUGINS")) {
			const sentryInstance = this.Fahrplan.getPluginInstance("sentry");
			if (sentryInstance) {
				this.Sentry = sentryInstance.getSentryObject();
			}
		}
	}
	//#endregion

	//#region Helper Function ErrorCustom
	/**
	 * Helper function for StationSearch in Admin
	 * @param {String} Name Name for error
	 * @param {string} Message Error message
	 */
	ErrorCustom(Name, Message = ""){
		try{
			const Err = new Error();
			Err.name = Name;
			Err.message = Message;
			return Err;
		} catch (e){
			this.Fahrplan.log.error(`Exception in ErrorCustom [${e}]`);
		}
	}
	//#endregion

	//#region Helper Function ReportingError
	/**
	 * Helper function for global error reporting
	 * @param {Object} Err Error-Object
	 * @param {string} FriendlyError Error message for user
	 * @param {string} NameClass Name of the class where error occured
	 * @param {string} NameFunction Name of the function where error occured
	 * @param {string} NameSubFunction Name of the subfunction where error occured
	 * @param {Object} Info Contextual information
	 */
	// eslint-disable-next-line no-unused-vars
	async ReportingError(Err, FriendlyError, NameClass, NameFunction, NameSubFunction = "", Info = [], ReportSentry = true){
		try{
			let sErrMsg = `Error occured: ${FriendlyError} in ${NameClass}/${NameFunction}`;
			if (NameSubFunction !== "") sErrMsg = sErrMsg + `(${NameSubFunction})`;
			if (Err.name !== "HANDLED") sErrMsg = sErrMsg + ` [${Err}]`;
			this.Fahrplan.log.error(sErrMsg);
		} catch (e){
			this.Fahrplan.log.error(`Exception in ErrorReporting [${e}]`);
		}
		// Sentry reporting
		try{
			if (this.Sentry && this.Fahrplan.config.NoSentry === false && ReportSentry === true) {
				this.Sentry && this.Sentry.withScope(scope => {
					scope.setLevel("error");
					scope.setExtra("NameClass", NameClass);
					scope.setExtra("NameFunction", NameFunction);
					scope.setExtra("NameSubFunction", NameSubFunction);
					if (Info.json){
						scope.setExtra("API-JSON", Info.json);
					}
					scope.setExtra("Config", JSON.stringify(this.Fahrplan.config));
					for (const name of Object.getOwnPropertyNames(Err)) {
						scope.setExtra(`Error.${name}`, Err[name]);
					}
					//{json: eBhf, hafas: {request: e.request, url: e.url, statusCode: e.statusCode, code: e.code, responseId: e.responseId} })
					if (Info.hafas !== null){
						scope.setExtra("HAFAS-request", Info.hafas.request);
						scope.setExtra("HAFAS-url", Info.hafas.url);
						scope.setExtra("HAFAS-statusCode", Info.hafas.statusCode);
						scope.setExtra("HAFAS-code", Info.hafas.code);
						scope.setExtra("HAFAS-responseId", Info.hafas.responseId);
						// Filter unnecessary events from HAFAS
						if (Info.hafas.code === "CGI_READ_FAILED" ||
							Info.hafas.code === "CGI_NO_SERVER" ||
							Info.hafas.statusCode === 500 ||
							Info.hafas.statusCode === 503 ||
							Info.hafas.statusCode === 504 ||
							Info.hafas.statusCode === 502 ||
							(Info.hafas.code === "PARSE" && Err.message === "Parser error: root.svcResL.svcResL.res.common.rtSrcL.rtSrcL.type()" && Info.hafas.url === "https://fahrplan.oebb.at/bin/mgate.exe?") ||
							(Info.hafas.code === "WRITE" && Err.message.startsWith("Writer error") ) ){
							ReportSentry = false;
						}
					}
					if (ReportSentry === true){
						this.Sentry.captureException(Err);
					}
				});
			}
		} catch (e){
			this.Fahrplan.log.error(`Exception in ErrorReporting Sentry [${e}]`);
		}
	}
	//#endregion

	//#region Helper Function ReportingInfo
	/**
	 * Function for global information reporting
	 * @param {"Info"|"Debug"} Level Level for ioBroker Logging
	 * @param {string} Category Category of information
	 * @param {string} Message Message
	 * @param {string} NameClass Name of the class where error occured
	 * @param {string} NameFunction Name of the function where error occured
	 * @param {string} NameSubFunction Name of the subfunction where error occured
	 * @param {string} Info Contextual information
	 */
	ReportingInfo(Level, Category, Message, NameClass, NameFunction, NameSubFunction = "", Info = "") {
		let iobMessage = Message;
		if (this.Fahrplan.log.level === "debug" || this.Fahrplan.log.level === "silly"){
			iobMessage = `[${Category}] ${Message}`;
		}
		switch(Level){
			case "Debug":
				this.Fahrplan.log.debug(iobMessage);
				break;
			default:
				this.Fahrplan.log.info(iobMessage);
				break;
		}
		const Data = { NameClass: NameClass, NameFunction: NameFunction, NameSubFunction: NameSubFunction };
		if (Info !== ""){
			Data.Info = Info;
		}
		if (this.Sentry){
			this.Sentry.addBreadcrumb({
				category: Category,
				message: Message,
				level: Level,
				data: Data
			});
		}
	}
	//#endregion

	//#region Helper Function getStation
	/**
	 * Helper function for StationSearch in Admin
	 * @param {string} sProvider Configured provider in Admin
	 * @param {string} sSearchString Searchstring entered in Admin
	 */
	async getStation(sProvider, sSearchString){
		try{
			this.ReportingInfo("Debug", "Adapter", `Executing HAFAS search for Stations: Provider = ${sProvider} SearchString = ${sSearchString}`, "fHelpers", "getStation");
			const sResult = await this.hClient.locations(sSearchString, {results: 10, stops: true, addresses: false, poi: false});
			this.ReportingInfo("Debug", "Adapter", `Result received for search: ${JSON.stringify(sResult)}`, "fHelpers", "getStation", "", JSON.stringify(sResult));
			return sResult;
		} catch (e){
			this.ReportingError(e, `Exception receiving Stations`, "fHelpers", "createHTML", "", {provider: sProvider, searchstring: sSearchString});
			throw this.ErrorCustom("HANDLED");
		}
	}
	//#endregion

	//#region Helper Function verifyConfig
	/**
	 * Helper function for verifying config in Admin
	 * @param {object} config Configuration object from Admin
	 */
	async verifyConfig(config){
		try{
			const Station = new fStation(this);
			const Result = { result: true, msg: new Array()};
			if (config.Provider === "" || config.Provider === null){
				Result.result = false;
				Result.msg.push("Provider not configured");
			}
			if (config.routes && Array.isArray(config.routes)){
				let CounterRoutes = 0;
				for (const element of config.routes){
					CounterRoutes++;
					if (element.enabled === true){
						if (element.station_from === "0" || element.station_from === "" || await Station.verifyStation(element.station_from) === false){
							Result.result = false;
							Result.msg.push({ text: "FahrplanConfigErrorStationFrom", arg1: element.station_from, arg2: CounterRoutes});
						}
						if (element.station_to === "0" || element.station_to === "" || await Station.verifyStation(element.station_to) === false){
							Result.result = false;
							Result.msg.push({ text: "FahrplanConfigErrorStationTo", arg1: element.station_to, arg2: CounterRoutes});
						}
						if (element.station_via !== ""){
							if (element.station_via === "0" || await Station.verifyStation(element.station_via) === false){
								Result.result = false;
								Result.msg.push({ text: "FahrplanConfigErrorStationVia", arg1: element.station_via, arg2: CounterRoutes});
							}
						}
						if (element.station_from === element.station_to){
							Result.result = false;
							Result.msg.push({ text: "FahrplanConfigErrorStationDuplicate", arg1: element.station_to, arg2: CounterRoutes});
						}
						if (! (element.traintype.length > 0) ){
							Result.result = false;
							Result.msg.push({ text: "FahrplanConfigErrorNoProduct", arg1: CounterRoutes});
						}
					}
				}
			}
			if (config.departuretimetable && Array.isArray(config.departuretimetable)){
				let CounterDepTT = 0;
				for (const element of config.departuretimetable){
					if (element.enabled === true){
						if (element.station_from === "0" || element.station_from === "" || await Station.verifyStation(element.station_from) === false){
							Result.result = false;
							Result.msg.push({ text: "FahrplanConfigErrorStationDepTT", arg1: element.station_from, arg2: CounterDepTT});
						}
					}
					if (! (element.traintype.length > 0) ){
						Result.result = false;
						Result.msg.push({ text: "FahrplanConfigErrorProductDepTT", arg1: CounterDepTT});
					}
					CounterDepTT++;
				}
			}
			this.ReportingInfo("Debug", "Adapter", `Config verified: ${JSON.stringify(Result)}`, "fHelpers", "verifyConfig", "", JSON.stringify(Result));
			return Result;
		} catch (e){
			//this.ErrorReporting(e, `Exception verifying config`, "fHelpers", "verifyConfig", "", {config: config});
			return { result: false, msg: "Unknown error in verifying config, please check config"};
		}
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
	async SetTextState(sStateName, sDisplayName, sDescription, sValue, sRole = "state"){
		try{
			if (this.isUnloaded === false){
				await this.Fahrplan.setObjectNotExistsAsync(sStateName, {
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
				await this.Fahrplan.setStateAsync(sStateName, { val: sValue, ack: true });
			}
			return true;
		}catch(e){
			this.ReportingError(e, `Exception writing State`, "fHelpers", "SetTextState", "", {name: sStateName, displayname: sDisplayName, description: sDescription, value: sValue});
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
	async SetNumState(sStateName, sDisplayName, sDescription, sValue, sRole = "value"){
		try{
			if (this.isUnloaded === false){
				await this.Fahrplan.setObjectNotExistsAsync(sStateName, {
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
				await this.Fahrplan.setStateAsync(sStateName, { val: sValue, ack: true });
			}
			return true;
		}catch(e){
			this.ReportingError(e, `Exception writing State`, "fHelpers", "SetNumState", "", {name: sStateName, displayname: sDisplayName, description: sDescription, value: sValue, role: sRole});
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
	async SetBoolState(sStateName, sDisplayName, sDescription, bValue){
		try{
			if (this.isUnloaded === false){
				await this.Fahrplan.setObjectNotExistsAsync(sStateName, {
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
				await this.Fahrplan.setStateAsync(sStateName, { val: bValue, ack: true });
			}
			return true;
		} catch (e){
			this.ReportingError(e, `Exception writing State`, "fHelpers", "SetBoolState", "", {name: sStateName, displayname: sDisplayName, description: sDescription, value: bValue});
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
	async SetChannel(sStateName, sDisplayName, sDescription){
		try{
			if (this.isUnloaded === false){
				await this.Fahrplan.setObjectNotExistsAsync(sStateName,{
					type: "channel",
					common:{
						name: sDisplayName,
						desc: sDescription
					},
					native:{}
				});
			}
			return true;
		} catch (e){
			this.ReportingError(e, `Exception writing State`, "fHelpers", "SetChannel", "", {name: sStateName, displayname: sDisplayName, description: sDescription});
		}
	}
	//#endregion

	//#region Helper Function deleteObject
	/**
	* Deletes object
	* @param {string} sStateName Name of the State
	*/
	async deleteObject(sStateName){
		try{
			// Verify that associated object exists
			const CurrentObj = await this.Fahrplan.getObjectAsync(sStateName);
			if (CurrentObj){
				if (this.isUnloaded === false) await this.Fahrplan.delObjectAsync(sStateName);
			} else{
				const CurrentState = await this.Fahrplan.getStateAsync(sStateName);
				if (CurrentState){
					if (this.isUnloaded === false) await this.Fahrplan.deleteStateAsync(sStateName);
				}
			}
		}catch(e){
			this.ReportingError(e, `Exception removing State`, "fHelpers", "deleteObject", "", {name: sStateName});
		}
	}
	//#endregion

	//#region Helper Function deleteConnections
	/**
	* Sets boolean State
	* @param {Number} iRoute Number of Route from configuration
	*/
	async deleteConnections(iRoute){
		try{
			const States = await this.Fahrplan.getStatesOfAsync(iRoute.toString());
			for (const State of States){
				if (State["_id"] !== `${this.Fahrplan.name}.${this.Fahrplan.instance}.${iRoute}.Enabled`) {
					// Verify that associated object exists
					const CurrentObj = await this.Fahrplan.getObjectAsync(State.toString());
					if (CurrentObj){
						if (this.isUnloaded === false) await this.Fahrplan.delObjectAsync(State.toString());
					} else{
						const CurrentState = await this.Fahrplan.getStateAsync(State.toString());
						if (CurrentState){
							if (this.isUnloaded === false) await this.Fahrplan.deleteStateAsync(State.toString());
						}
					}
				}
			}
		}catch(e){
			this.ReportingError(e, `Exception removing Connection`, "fHelpers", "deleteConnections");
		}
	}
	//#endregion

	//#region Helper Function deleteConnections
	/**
	* Sets boolean State
	* @param {Number} iDepTT Number of Departure Timetable from configuration
	*/
	async deleteDepTT(iDepTT){
		try{
			const States = await this.Fahrplan.getStatesOfAsync(`DepartureTimetable${iDepTT.toString()}`);
			for (const State of States){
				if (State["_id"] !== `${this.Fahrplan.name}.${this.Fahrplan.instance}.DepartureTimetable${iDepTT}.Enabled`) {
					// Verify that associated object exists
					const CurrentObj = await this.Fahrplan.getObjectAsync(State.toString());
					if (CurrentObj){
						if (this.isUnloaded === false) await this.Fahrplan.delObjectAsync(State.toString());
					} else{
						const CurrentState = await this.Fahrplan.getStateAsync(State.toString());
						if (CurrentState){
							if (this.isUnloaded === false) await this.Fahrplan.deleteStateAsync(State.toString());
						}
					}
				}
			}
		}catch(e){
			this.ReportingError(e, `Exception removing Departure Timetable`, "fHelpers", "deleteDepTT");
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
	async deleteUnusedSections(iRoute, iConnection, iSections){
		//let StatesJSON;
		let Status;
		const SectionRegEx = `${this.Fahrplan.name}\\.${this.Fahrplan.instance}\\.${iRoute.toString()}\\.${iConnection.toString()}\\.(\\d*)\\..*$`;
		try{
			const States = await this.Fahrplan.getStatesAsync(`${iRoute.toString()}.${iConnection.toString()}.*`);
			//StatesJSON = JSON.stringify(States);
			this.ReportingInfo("Debug", "Route", `Delete unused sections for Route #${iRoute}, Connection #${iConnection} with max section # ${iSections} and regex:${SectionRegEx}`, "fHelpers", "deleteUnusedSections");
			for (const State in States){
				Status = {action: "For", CurrentState: State.toString(), Delete: false, Type: "unknown"};
				const Searcher = State.toString().match(new RegExp(SectionRegEx));
				if (Searcher !== null){
					if (parseInt(Searcher[1]) > iSections ){
						Status.Delete = true;
						// Verify that associated object exists
						const CurrentObj = await this.Fahrplan.getObjectAsync(State.toString());
						if (CurrentObj){
							Status.Type = "object";
							if (this.isUnloaded === false) await this.Fahrplan.delObjectAsync(State.toString());
						} else{
							const CurrentState = await this.Fahrplan.getStateAsync(State.toString());
							if (CurrentState){
								Status.Type = "state";
								if (this.isUnloaded === false) await this.Fahrplan.deleteStateAsync(State.toString());
							}
						}
					}
				}
			}
		}catch(e){
			this.ReportingError(e, `Exception removing unused Sections`, "fHelpers", "deleteUnusedSections", "DeleteStates",{json: JSON.stringify(Status)});
		}
		let ChannelsJSON;
		try{
			const Channels = await this.Fahrplan.getChannels();
			if (Channels){
				ChannelsJSON = JSON.stringify(Channels);
				for (const Channel of Channels){
					if (Channel["_id"]){
						const Searcher = Channel["_id"].toString().match(new RegExp(SectionRegEx));
						if (Searcher !== null){
							if (parseInt(Searcher[1]) > iSections ){
								if (this.isUnloaded === false) this.Fahrplan.delObject(Channel["_id"]);
							}
						}
					}
				}
			}
		}catch(e){
			this.ReportingError(e, `Exception removing unused Sections`, "fHelpers", "deleteUnusedSections", "DeleteChannels",{json: ChannelsJSON});
		}
	}
	//#endregion

	//#region Helper Function deleteUnusedConnections
	/**
	* Sets boolean State
	* @param {Number} iRoute Number of Route from configuration
	* @param {Number} iConnections Number of Connections in Route
	*/
	async deleteUnusedConnections(iRoute, iConnections){
		//let StatesJSON;
		let Status;
		const SectionRegEx = `${this.Fahrplan.name}\\.${this.Fahrplan.instance}\\.${iRoute.toString()}\\.(\\d*)\\..*$`;
		try{
			const States = await this.Fahrplan.getStatesAsync(`${iRoute.toString()}.*`);
			//StatesJSON = JSON.stringify(States);
			this.ReportingInfo("Debug", "Route", `Delete unused connections for Route #${iRoute} with max Connection #${iConnections} and regex:${SectionRegEx}`, "fHelpers", "deleteUnusedConnections");
			for (const State in States){
				Status = {action: "For", CurrentState: State.toString(), Delete: false, Type: "unknown"};
				const Searcher = State.toString().match(new RegExp(SectionRegEx));
				if (Searcher !== null){
					if (parseInt(Searcher[1]) >= iConnections ){
						Status.Delete = true;
						// Verify that associated object exists
						const CurrentObj = await this.Fahrplan.getObjectAsync(State.toString());
						if (CurrentObj){
							Status.Type = "object";
							if (this.isUnloaded === false) await this.Fahrplan.delObjectAsync(State.toString());
						} else{
							const CurrentState = await this.Fahrplan.getStateAsync(State.toString());
							if (CurrentState){
								Status.Type = "state";
								if (this.isUnloaded === false) await this.Fahrplan.deleteStateAsync(State.toString());
							}
						}
					}
				}
			}
		}catch(e){
			this.ReportingError(e, `Exception removing unused Connections`, "fHelpers", "deleteUnusedConnections", "DeleteStates",{json: JSON.stringify(Status)});
		}
		let ChannelsJSON;
		try{
			const Channels = await this.Fahrplan.getChannels();
			if (Channels){
				ChannelsJSON = JSON.stringify(Channels);
				for (const Channel of Channels){
					if (Channel["_id"]){
						const Searcher = Channel["_id"].toString().match(new RegExp(SectionRegEx));
						if (Searcher !== null){
							if (parseInt(Searcher[1]) >= iConnections ){
								if (this.isUnloaded === false) this.Fahrplan.delObject(Channel["_id"]);
							}
						}
					}
				}
			}
		}catch(e){
			this.ReportingError(e, `Exception removing unused Connections`, "fHelpers", "deleteUnusedConnections", "DeleteChannels",{json: ChannelsJSON});
		}
	}
	//#endregion

	//#region Helper Function deleteUnusedDepartures
	/**
	* Sets boolean State
	* @param {Number} iDepTT Number of Departure Timetable from configuration
	* @param {Number} iDepartures Number of Departures in Departure Timetable
	*/
	async deleteUnusedDepartures(iDepTT, iDepartures){
		let StatesJSON;
		const SectionRegEx = `${this.Fahrplan.name}\\.${this.Fahrplan.instance}\\.DepartureTimetable${iDepTT.toString()}\\.(\\d*)\\..*$`;
		try{
			const States = await this.Fahrplan.getStatesAsync(`DepartureTimetable${iDepTT.toString()}.*`);
			StatesJSON = JSON.stringify(States);
			this.ReportingInfo("Debug", "Departure Timetable", `Delete unused departures for Departure Timetable #${iDepTT} with max Departures #${iDepartures} and regex:${SectionRegEx.toString()}`, "fHelpers", "deleteUnusedDepartures");
			for (const State in States){
				const Searcher = State.toString().match(new RegExp(SectionRegEx));
				if (Searcher !== null){
					if (parseInt(Searcher[1]) >= iDepartures ){
						// Verify that associated object exists
						const CurrentObj = await this.Fahrplan.getObjectAsync(State.toString());
						if (CurrentObj){
							if (this.isUnloaded === false) await this.Fahrplan.delObjectAsync(State.toString());
						} else{
							const CurrentState = await this.Fahrplan.getStateAsync(State.toString());
							if (CurrentState){
								if (this.isUnloaded === false) await this.Fahrplan.deleteStateAsync(State.toString());
							}
						}
					}
				}
			}
		}catch(e){
			this.ReportingError(e, `Exception removing unused Departures`, "fHelpers", "deleteUnusedDepartures", "DeleteStates", {json: StatesJSON});
		}
		let ChannelsJSON;
		try{
			const Channels = await this.Fahrplan.getChannels();
			if (Channels){
				ChannelsJSON = JSON.stringify(Channels);
				for (const Channel of Channels){
					const Searcher = Channel["_id"].toString().match(new RegExp(SectionRegEx));
					if (Searcher !== null){
						if (parseInt(Searcher[1]) >= iDepartures ){
							if (this.isUnloaded === false) this.Fahrplan.delObject(Channel["_id"]);
						}
					}
				}
			}
		}catch(e){
			this.ReportingError(e, `Exception removing unused Departures`, "fHelpers", "deleteUnusedDepartures", "DeleteStates", {json: ChannelsJSON});
		}
	}
	//#endregion
}

//export default fHelpers;