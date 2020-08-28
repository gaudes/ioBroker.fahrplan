"use strict";

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

class fRouteOptions{
	constructor(helper){
		this.helper = helper;
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
				switch(this.helper.Fahrplan.config.Provider){
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
			throw new Error(`Exception in RouteOptions/setProducts [${e}]`);
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
			throw new Error(`Exception in fRouteOptions/returnRouteOptions [${e}]`);
		} 	
	} 

} 

module.exports = fRouteOptions