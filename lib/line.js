"use strict";

class fLine{
	constructor(helper){
        this.helper = helper;
		this.direction = "";
		this.mode = "";
		this.name = "";
		this.operator = "";
		this.product = "";
	}

	/**
	* Sets Line information by Object from HAFAS, e.g. from journey 
	* @param {object} Section Section object (contains direction)
	*/
	async setLine(Section){
		try {  
			this.direction = Section.direction;
			this.name = Section.line.name;
			this.mode = Section.line.mode;
			if (Section.line.operator) this.operator = Section.line.operator.name;
			this.product = Section.line.product;
		} catch(e) {
			throw new Error(`Exception in fLine/setLine [${e}]`);
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
			throw new Error(`Exception in fLine/writeLine [${e}]`);
		} 	
	}
}

module.exports = fLine