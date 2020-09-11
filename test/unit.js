const path = require("path");
const { tests, utils } = require("@iobroker/testing");
const { expect } = require("chai");

function delay(t, val) {
	return new Promise(function(resolve) {
		setTimeout(function() {
			resolve(val);
		}, t);
	});
}

// Run unit tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.unit(path.join(__dirname, ".."),{
	defineAdditionalTests(){
		// @ts-ignore
		const { adapter, database } = utils.unit.createMocks();
		// const { assertObjectExists } = utils.unit.createAsserts(database, adapter);
		const fHelper = require("../lib/helper.js");
		const hCreateClient = require("hafas-client");
		const hDBprofile = require("hafas-client/p/db");
		const Helper = new fHelper(adapter);
		Helper.hClient = hCreateClient(hDBprofile, "ioBroker.Fahrplan");
		const fStation = require("../lib/station.js");
		const Station = new fStation(Helper);
		let JSONDepTT = "";



		describe("Test RouteOptions", () =>{
			const fRouteOptions = require("../lib/routeoptions.js");
			const RouteOptions = new fRouteOptions(Helper);

			it("setProducts", async () =>{
				RouteOptions.setProducts("suburban");
				expect(RouteOptions).to.deep.include({products:{suburban: true}});
			});

			it("returnRouteOptions", async () =>{
				expect(RouteOptions.returnRouteOptions()).to.deep.include({products:{suburban: true}});
			});
		} );

		describe("Test Station", () =>{
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

		describe("Test DepTT", () =>{
			const fDeptTT = require("../lib/deptt.js");
			const DepTT = new fDeptTT(Helper);

			it("getDepTT", async () =>{
				DepTT.StationFrom = Station;
				DepTT.enabled = true;
				await DepTT.getDepTT();
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

	}
} );
