"use strict";

export default class fLine{
	constructor(helper){
		this.helper = helper;
		this.direction = "";
		this.mode = "";
		this.name = "";
		this.operator = "";
		this.product = "";
		this.json = "";
	}

	/**
	* Sets Line information by Object from HAFAS, e.g. from journey
	* @param {object} Section Section object (contains direction)
	*/
	async setLine(Section){
		try {
			this.json = Section;
			this.direction = Section.direction;
			this.name = Section.line.name;
			this.mode = Section.line.mode;
			if (Section.line.operator) this.operator = Section.line.operator.name;
			this.product = Section.line.product;
		} catch(e) {
			this.helper.ReportingError(e, `Exception in Line`, "fLine", "setLine", {json: Section});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Writes Line information to ioBroker
	* @param {string} BasePath Path to channel with station information
	*/
	async writeLine(BasePath){
		try {
			await this.helper.SetChannel(`${BasePath}`, this.name, "Line");
			await this.helper.SetTextState(`${BasePath}.Name`, "Line Name", "Line Name", this.name);
			await this.helper.SetTextState(`${BasePath}.Direction`, "Line Direction", "Line Direction", this.direction);
			await this.helper.SetTextState(`${BasePath}.Mode`, "Line Mode", "Line Mode", this.mode);
			await this.helper.SetTextState(`${BasePath}.Operator`, "Line Operator", "Line Operator", this.operator);
			await this.helper.SetTextState(`${BasePath}.Product`, "Line Product", "Line Product", this.product);
		} catch(e) {
			this.helper.ReportingError(e, `Exception in Line`, "fLine", "writeLine", {json: this.json});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/**
	* Returns translated product
	*/
	translateProduct(){
		try {
			if (this.helper.hProfile !== null){
				const result = this.helper.hProfile.products.filter(obj => {
					return obj.id === this.product;
				});
				return result[0].short;
			} else{
				return this.product;
			}
		} catch(e) {
			this.helper.ReportingError(e, `Exception in Line`, "fLine", "translateProduct", "", {product: this.product});
			throw this.helper.ErrorCustom("HANDLED");
		}
	}
}

//export default fLine;