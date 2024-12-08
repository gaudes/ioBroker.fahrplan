import path from "path";
import { fileURLToPath } from "url";
import { tests } from "@iobroker/testing";

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate the package files
tests.packageFiles(path.join(__dirname, ".."));
