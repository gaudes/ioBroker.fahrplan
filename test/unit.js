import path from "path";
import { fileURLToPath } from "url";
import { tests, utils } from "@iobroker/testing";
import { expect } from "chai";
import fHelper from "../lib/helper.js";
import { createClient as hCreateClient } from "hafas-client";
import {profile as hDBprofile} from "hafas-client/p/db/index.js";
import fRouteOptions from "../lib/options.js";
import fStation from "../lib/station.js";
import fRoute from "../lib/route.js";
import fDeptTT from "../lib/deptt.js";

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function delay(t, val) {
	return new Promise(function(resolve) {
		setTimeout(function() {
			resolve(val);
		}, t);
	});
}
tests.unit(path.join(__dirname, ".."), {
	defineAdditionalTests() {
		// Run unit tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
		// @ts-ignore
		const { adapter, database } = utils.unit.createMocks();
		// const { assertObjectExists } = utils.unit.createAsserts(database, adapter);
		//import fHelper from "../lib/helper.js";
		//import hCreateClient from "hafas-client";
		const Helper = new fHelper(adapter);
		Helper.hClient = hCreateClient(hDBprofile, "ioBroker.Fahrplan");
		const RouteOptions = new fRouteOptions(Helper);
		//import fStation from "../lib/station.js";
		//import fRoute from "../lib/route.js";
		const Route = new fRoute(Helper);
		const RouteConfig = {
			"enabled": true,
			"station_from": "8000105",
			"station_from_name": "",
			"station_to": "8000349",
			"station_to_name": "",
			"station_via": "",
			"traintype": [ "all" ],
			"transfers": "0",
			"bicycle": false
		};
		const fJourney = require("../lib/journey.js");
		const Journey = new fJourney(Helper);
		let JSONDepTT = "";
		let JSONJourney = "";
		//#endregion

		//#region Test class RouteOptions
		describe("Test RouteOptions", () =>{
			it("setProducts", async () =>{
				RouteOptions.setProducts("suburban");
				expect(RouteOptions).to.deep.include({products:{suburban: true}});
			});

			it("returnRouteOptions", async () =>{
				expect(RouteOptions.returnRouteOptions()).to.deep.include({products:{suburban: true}});
			});

			it("returnDepTTOptions", async () =>{
				expect(RouteOptions.returnDepTTOptions()).to.deep.include({products:{suburban: true}});
			});
		} );
		//#endregion

		//#region Test class Station
		describe("Test Station", () =>{
			const Station = new fStation(Helper);
			it("getStation", async () =>{
				await Station.getStation("8000105");
				expect(Station.id).to.equal("8000105");
				expect(Station.type).to.equal("stop");
			});

			it("setStation", async () =>{
				await Station.setStation(JSON.parse(Station.json)[0]);
				expect(Station.id).to.equal("8000105");
				expect(Station.type).to.equal("stop");
			});

			it("writeStation", async () =>{
				await Station.writeStation("Station", "Station");
				expect(database.getState("test.0.Station.eBhf")).to.deep.include({ val: "8000105" });
			});
		} );
		//#endregion

		//#region Test class Route
		describe("Test Route", () =>{
			it("getRoute", async () =>{
				Route.index = 0;
				Route.enabled = true;
				Route.StationFrom = Station;
				await Route.StationTo.getStation(RouteConfig.station_to);
				await Route.getRoute(RouteOptions);
				expect(Route.Journeys[0]).to.deep.property("json");
				JSONJourney = Route.Journeys[0].json;
			}).timeout(8000);

			it("writeBaseStates", async () =>{
				await Route.writeBaseStates();
				expect(database.getState("test.0.0.Enabled")).to.deep.include({ val: true });
			});

			it("writeStates", async () =>{
				await Route.writeStates();
				await delay (1000);
				expect(database.getStates("test.0.0.0")).has.property("test.0.0.0.JSON");
			}).timeout(3000);

			it("CreateHTML", async () =>{
				adapter.config["CreateHTML"] = 1;
				await Route.writeHTML();
				expect(database.getStates("test.0.0")).has.property("test.0.0.HTML");
			});
		} );
		//#endregion

		//#region Test class Journey
		describe("Test Journey", () =>{
			it("parse", async () =>{
				Journey.StationFrom = Route.StationFrom;
				Journey.StationTo = Route.StationTo;
				Journey.parseJourney(JSON.parse(JSONJourney));
				expect(Journey.Sections.length).has.to.be.above(0);
			});

			it("writeJourney", async () =>{
				await Journey.writeJourney("Journey", 0, 0);
				await delay (1000);
				expect(database.getStates("test.0.Journey")).has.property("test.0.Journey.JSON");
			}).timeout(3000);

			it("createHTML", async () =>{
				expect(Journey.createHTML()).to.be.a("string").and.satisfy(msg => msg.startsWith("<tr><td>"));
			});

			it("writeJourneyHTML", async () =>{
				adapter.config["CreateHTMLJourney"] = 1;
				await Journey.writeJourneyHTML("Journey");
				expect(database.getStates("test.0.Journey")).has.property("test.0.Journey.HTML");
			});
		} );
		//#endregion

		//#region Test class DepTT
		describe("Test DepTT", () =>{
			const DepTT = new fDeptTT(Helper);

			it("getDepTT", async () =>{
				DepTT.StationFrom = Station;
				DepTT.enabled = true;
				await DepTT.getDepTT(RouteOptions);
				JSONDepTT = DepTT.json;
				expect(DepTT.Departures).has.lengthOf(3);
			});

			it("writeBaseStates", async () =>{
				await DepTT.writeBaseStates();
				expect(database.getState("test.0.DepartureTimetable0.Enabled")).to.deep.include({ val: true });
			});

			it("writeStates", async () =>{
				await DepTT.writeStates();
				await delay (1000);
				expect(database.getState("test.0.DepartureTimetable0.0.Name")).to.deep.include({ val: DepTT.Departures[0].Line.name } );
			}).timeout(5000);

			it("writeHTML", async () =>{
				await DepTT.writeHTML();
				expect(database.getState("test.0.DepartureTimetable0.HTML")).has.property("val");
				// @ts-ignore
				expect(database.getState("test.0.DepartureTimetable0.HTML").val).to.be.a("string").and.satisfy(msg => msg.startsWith("<table>"));
			});
		} );
		//#endregion

		//#region Test class DepTTDep
		describe("Test DepTTDep", () =>{
			const fDeptTTDep = require("../lib/depttdep.js");
			const DepTTDep = new fDeptTTDep(Helper);

			it("parse", async () =>{
				DepTTDep.StationFrom = Station;
				await DepTTDep.parse(JSON.parse(JSONDepTT)[0]);
				expect(DepTTDep).to.deep.property("departure");
			});

			it("write", async () =>{
				await DepTTDep.write("DepTTDep", 0);
				expect(database.getState("test.0.DepTTDep.JSON")).has.property("val");
			});

			it("createHTML", async () =>{
				expect(DepTTDep.createHTML()).to.be.a("string").and.satisfy(msg => msg.startsWith("<tr>"));
			});
		} );
		//#endregion

	}
} );
