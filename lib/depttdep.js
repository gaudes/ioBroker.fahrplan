import fStation from "./station.js";
import fLine from "./line.js";

export default class fDepTTDep {
	constructor(helper) {
		this.helper = helper;
		this.StationFrom = new fStation(helper);
		this.Line = new fLine(helper);
		this.departure = null;
		this.departurePlanned = null;
		this.departureDelaySeconds = 0;
		this.departureDelayed = false;
		this.departureOnTime = false;
		this.html = "";
	}

	/**
	 * Parses JSON-input from HAFAS Departure
	 *
	 * @param Departure JSON result from HAFAS
	 */
	parse(Departure) {
		this.json = JSON.stringify(Departure);
		try {
			this.StationFrom.setStation(Departure.stop);
			if (Departure["platform"]) {
				this.StationFrom.platform = Departure.platform;
			}
			if (Departure["plannedPlatform"]) {
				this.StationFrom.platformplanned = Departure.plannedPlatform;
			}
			//  Departure information
			this.departure = Departure.when;
			this.departurePlanned = Departure.plannedWhen;
			if (Departure.delay !== null && Departure.delay >= 0) {
				this.departureDelaySeconds = Departure.delay;
				if (Departure.delay === 0 && Departure.delay < this.helper.Fahrplan.config.DelayTime * 60) {
					this.departureOnTime = true;
				} else if (Departure.delay >= this.helper.Fahrplan.config.DelayTime * 60) {
					this.departureDelayed = true;
				}
			}
			// Line information
			if (Departure["line"]) {
				this.Line.setLine(Departure);
			}
		} catch (e) {
			this.helper.ReportingError(e, `Exception in Connection for Departure Timetable`, "fDepTTDep", "parse", "", {
				json: Departure,
			});
		}
	}

	/**
	 * Writes Departure information to ioBroker
	 *
	 * @param BasePath Path to channel with departure information
	 * @param DepTTIndex Index number of Departure Timetable
	 */
	async write(BasePath, DepTTIndex) {
		try {
			await this.helper.SetChannel(`${BasePath}`, `Departure ${this.StationFrom.name}`, `Departure`);
			if (this.helper.Fahrplan.config.SaveJSON !== false) {
				await this.helper.SetTextState(
					`${BasePath}.JSON`,
					"Departure JSON",
					"Departure JSON",
					this.json,
					"json",
				);
			}
			// Overall Departure Values
			await this.helper.SetNumState(
				`${BasePath}.Departure`,
				"Departure",
				"Departure",
				new Date(this.departure).getTime(),
				"date",
			);
			await this.helper.SetNumState(
				`${BasePath}.DeparturePlanned`,
				"DeparturePlanned",
				"DeparturePlanned",
				new Date(this.departurePlanned).getTime(),
				"date",
			);
			await this.helper.SetNumState(
				`${BasePath}.DepartureDelaySeconds`,
				"DepartureDelaySeconds",
				"DepartureDelaySeconds",
				this.departureDelaySeconds,
			);
			await this.helper.SetBoolState(
				`${BasePath}.DepartureOnTime`,
				"DepartureOnTime",
				"DepartureOnTime",
				this.departureOnTime,
			);
			await this.helper.SetBoolState(
				`${BasePath}.DepartureDelayed`,
				"DepartureDelayed",
				"DepartureDelayed",
				this.departureDelayed,
			);
			// Write Line
			await this.Line.writeLine(BasePath);
		} catch (e) {
			this.helper.ReportingError(
				e,
				`Exception in Connection for Departure Timetable ${DepTTIndex} `,
				"fDepTTDep",
				"write",
				"",
				{ json: this.json },
			);
			throw this.helper.ErrorCustom("HANDLED");
		}
	}

	/*
	 * Creates HTML table column with HTML
	 */
	createHTML() {
		try {
			let ColorOntime = "#008000";
			if (this.helper.Fahrplan.config.ColorOntime) {
				ColorOntime = this.helper.Fahrplan.config.ColorOntime;
			}
			let ColorDelay = "#ff0000";
			if (this.helper.Fahrplan.config.ColorDelay) {
				ColorDelay = this.helper.Fahrplan.config.ColorDelay;
			}
			let sHTML = "<tr>";
			// Departure Time
			if (this.departureOnTime === true) {
				sHTML = `${sHTML}<td><font color="${ColorOntime}">${this.helper.Fahrplan.formatDate(new Date(this.departure), "hh:mm")}</font></td>`;
			} else if (this.departureDelayed === true) {
				sHTML = `${sHTML}<td><font color="${ColorDelay}">${this.helper.Fahrplan.formatDate(new Date(this.departure), "hh:mm")}</font></td>`;
			} else {
				sHTML = `${sHTML}<td>${this.helper.Fahrplan.formatDate(new Date(this.departure), "hh:mm")}</td>`;
			}
			sHTML = `${sHTML}<td>${this.Line.direction}</td>`;
			// Departure platform
			if (this.StationFrom.platform === null) {
				sHTML = `${sHTML}<td>-</td>`;
			} else if (this.StationFrom.platform === this.StationFrom.platformplanned) {
				sHTML = `${sHTML}<td><font color="${ColorOntime}">${this.StationFrom.platform}</font></td>`;
			} else {
				sHTML = `${sHTML}<td><font color="${ColorDelay}">${this.StationFrom.platform}</font></td>`;
			}
			// Departure delay time
			const Delay = Math.ceil(this.departureDelaySeconds / 60);
			if (this.departureOnTime === true) {
				sHTML = `${sHTML}<td><font color="${ColorOntime}">${Delay}</font></td>`;
			} else if (this.departureDelayed === true) {
				sHTML = `${sHTML}<td><font color="${ColorDelay}">${Delay}</font></td>`;
			} else {
				sHTML = `${sHTML}<td>${Delay}</td>`;
			}
			sHTML = `${sHTML}<td>${this.Line.translateProduct()}</td>`;
			sHTML = `${sHTML}</tr>`;
			return sHTML;
		} catch (e) {
			this.helper.ReportingError(
				e,
				`Exception in Connection for Departure Timetable`,
				"fDepTTDep",
				"createHTML",
				"",
				{ json: this.json },
			);
			throw this.helper.ErrorCustom("HANDLED");
		}
	}
}

// export default fDepTTDep;
