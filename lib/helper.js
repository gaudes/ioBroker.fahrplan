"use strict";

class fHelpers{

    //#region Constructor
	/**
	 * @param this-Object from Base-Class
	 */
    constructor(Fahrplan){
        this.Fahrplan = Fahrplan;
        this.hClient = null;
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
            this.Fahrplan.log.silly(`Search: Provider = ${sProvider} SearchString = ${sSearchString}`);
            const sResult = await this.Fahrplan.hClient.locations(sSearchString, {results: 10});
            this.Fahrplan.log.silly(`STATION: ${JSON.stringify(sResult)}`);
            return sResult;
        } catch (e){
            this.Fahrplan.log.error(`Exception in fHelpers/getStation [${e}]`);
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
			await this.Fahrplan.setObjectAsync(sStateName, {
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
			return true;
		}catch(e){
			this.Fahrplan.log.error(`Exception in fHelpers/SetTextState [${e}]`);
			throw `Exception in fHelpers/SetTextState [${e}]`;
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
			await this.Fahrplan.setObjectAsync(sStateName, {
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
			return true;
		}catch(e){
			this.Fahrplan.log.error(`Exception in fHelpers/SetNumState [${e}]`);
			throw `Exception in fHelpers/SetNumState [${e}]`;
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
			await this.Fahrplan.setObjectAsync(sStateName, {
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
			return true;
		} catch (e){
			this.Fahrplan.log.error(`Exception in fHelpers/SetBoolState [${e}]`);
			throw `Exception in fHelpers/SetBoolState [${e}]`;
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
			await this.Fahrplan.setObjectAsync(sStateName,{
				type: "channel",
				common:{
					name: sDisplayName,
					desc: sDescription
				},
				native:{} 
			});
			return true;
		} catch (e){
			this.Fahrplan.log.error(`Exception in fHelpers/SetChannel [${e}]`);
			throw `Exception in fHelpers/SetChannel [${e}]`;
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
			let State = await this.Fahrplan.getStateAsync(sStateName);
			if (State !== null){
				this.Fahrplan.delObject(sStateName);
			} 
		}catch(e){
			this.Fahrplan.log.error(`Exception in fHelpers/deleteObject [${e}]`);
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
			let States = await this.Fahrplan.getStatesOfAsync(iRoute.toString());
			for (let State of States){
				if (State["_id"] !== `${this.Fahrplan.name}.${this.Fahrplan.instance}.${iRoute}.Enabled`) { 
					await this.Fahrplan.delObjectAsync(State["_id"]);
				}	
			} 
		}catch(e){
			this.Fahrplan.log.error(`Exception in fHelpers/deleteConnections [${e}]`);
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
		try{ 
			let States = await this.Fahrplan.getObjectAsync(`${iRoute.toString()}.${iConnection.toString()}.*`);
			let SectionRegEx = `${this.Fahrplan.name}.${this.Fahrplan.instance}.${iRoute.toString()}.${iConnection.toString()}.(\\d*).*$`;
			this.Fahrplan.log.silly(`Delete Route #${iRoute} Connection #${iConnection} with max section # ${iSections} and regex:${SectionRegEx}`);	
			for (let State in States){
				let Searcher = State.toString().match(new RegExp(SectionRegEx));
				if (Searcher !== null){ 
					if (parseInt(Searcher[1]) > iSections ){
						await this.Fahrplan.delObjectAsync(State);
					}
				}	
			} 
			this.Fahrplan.getChannels((error, Channels) => {
				if (Channels && Channels !== null){ 
					for (let Channel of Channels){
						let Searcher = Channel["_id"].toString().match(new RegExp(SectionRegEx));
						if (Searcher !== null){ 
							if (parseInt(Searcher[1]) > iSections ){
								this.Fahrplan.delObject(Channel["_id"]);
							}
						}	
					}
				}	
			});
		}catch(e){
			this.Fahrplan.log.error(`Exception in fHelpers/deleteUnusedSections [${e}]`);
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
		try{ 
			let States = await this.Fahrplan.getObjectAsync(`${iRoute.toString()}.*`);
			let SectionRegEx = `${this.Fahrplan.name}.${this.Fahrplan.instance}.${iRoute.toString()}.(\\d*).*$`;
			this.Fahrplan.log.silly(`Delete Route #${iRoute} with max Connection #${iConnections} and regex:${SectionRegEx}`);	
			for (let State in States){
				let Searcher = State.toString().match(new RegExp(SectionRegEx));
				if (Searcher !== null){ 
					if (parseInt(Searcher[1]) > iConnections ){
						//adapter.log.error(State);
						await this.Fahrplan.delObjectAsync(State);
					}
				}	
			}
			this.Fahrplan.getChannels((error, Channels) => {
				if (Channels && Channels !== null){ 
					for (let Channel of Channels){
						let Searcher = Channel["_id"].toString().match(new RegExp(SectionRegEx));
						if (Searcher !== null){ 
							if (parseInt(Searcher[1]) > iConnections ){
								this.Fahrplan.delObject(Channel["_id"]);
							}
						}	
					}
				}	
			});
		}catch(e){
			this.Fahrplan.log.error(`Exception in fHelpers/deleteUnusedConnections [${e}]`);
		}
	} 
	//#endregion
} 

module.exports = fHelpers