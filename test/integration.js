import path from "path";
import { tests } from "@iobroker/testing";
import { expect } from "chai";
import { fileURLToPath } from "url";

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Run integration tests - See https://github.com/ioBroker/testing for a detailed explanation and further options
tests.integration(path.join(__dirname, ".."),{
	defineAdditionalTests({suite}){
		suite("Test sendTo()", (getHarness) => {
			// For convenience, get the current suite's harness before all tests
			let harness;
			before(() => {
				harness = getHarness();
			});

			it("Calling", () =>{
				return new Promise(async (resolve) =>{
					await harness.startAdapterAndWait();
					await new Promise(resolve => setTimeout(resolve, 7000));
					harness.sendTo(
						"fahrplan.0",
						"getStations",
						{ provider: "DB", station: "8000105"},
						(result) =>{
							console.dir(result);
							expect(result).to.be.an("array");
							expect(result[0]).to.deep.include({ id: "8000105" });
							resolve();
						} );
				});
			} ).timeout(20000);
		} );
	}} );
