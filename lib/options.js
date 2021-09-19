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
};
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
};

class fOptions{
	constructor(helper){
		this.helper = helper;
		this.results = 3;
		this.language = "de";
		this.remarks = true;
		this.via = "";
		this.transfers = -1;
		this.bycicles = false;
		this.products = null;
		this.depsOffsetMin = 0;
	}

	/**
	* Sets property products from configuration string
	* @param {string} Products Configured Products in Configuration of Adapter
	*/
	setProducts(Products){
		try{
			const aProducts = Products.split(",");
			if (!(aProducts.indexOf("all") > -1)){
				let aProductOption = {};
				switch(this.helper.Fahrplan.config.Provider){
					case "DB":
						aProductOption = hDBproducts;
						break;
					case "OEBB":
						aProductOption = hOEBBproducts;
						break;
				}
				for (const i in aProducts){
					aProductOption[aProducts[i]] = true;
				}
				this.products = aProductOption;
			}
		} catch (e){
			this.helper.ReportingError(e, `Exception in Route`, "fOptions", "setProducts", "", {json: Products});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Returns Route Options for HAFAS in JSON
	*/
	returnRouteOptions(){
		try{
			const aRouteOptions = { results: this.results, language: this.language, departure: new Date() };
			if (this.depsOffsetMin > 0) aRouteOptions["departure"] = new Date((new Date).getTime() + this.depsOffsetMin * 60000);
			if (this.via !== "") aRouteOptions["via"] = this.via;
			if (this.transfers >= 0) aRouteOptions["transfers"] = this.transfers;
			if (this.bycicles === true) aRouteOptions["bike"] = this.bycicles;
			if (this.products !== null) aRouteOptions["products"] = this.products;
			return aRouteOptions;
		} catch (e){
			this.helper.ReportingError(e, `Exception in Route`, "fOptions", "returnRouteOptions");
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Returns DepTT Options for HAFAS in JSON
	*/
	returnDepTTOptions(){
		try{
			const aDepTTOptions = { results: this.results, language: this.language, when: new Date(new Date().getTime() + this.depsOffsetMin * 60000), duration: 60 + this.depsOffsetMin };
			if (this.products !== null) aDepTTOptions["products"] = this.products;
			return aDepTTOptions;
		} catch (e){
			this.helper.ReportingError(e, `Exception in Departure Timetable`, "fOptions", "returnDepTTOptions");
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

}

module.exports = fOptions;