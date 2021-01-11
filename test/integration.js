const path = require("path");
const { tests } = require("@iobroker/testing");
const { expect } = require("chai");



// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, ".."),{
	defineAdditionalTests(getHarness){
		function sendToAsync(harness, adapter, command, options) {
			return new Promise((resolve) => {
				harness.sendTo(adapter, command, options, (result) => {
					resolve(result);
				});
			});
		}

		describe("Test Message", () =>{
			it("Calling", async () =>{
				const harness = getHarness();
				await harness.startAdapterAndWait();
				await new Promise(resolve => setTimeout(resolve, 5000));
				const result = await sendToAsync(
					harness,
					"fahrplan.0",
					"getStations",
					{ provider: "DB", station: "8000105",});
				console.dir(result);
				expect(result).to.be.an("array");
				expect(result[0]).to.deep.include({ id: "8000105" });
			} ).timeout(12000);
		} );
	}} );
