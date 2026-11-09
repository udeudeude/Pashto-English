import { a as VERSION, c as DATA_PATH, d as decode, f as httpDataSource, i as moduleFactoryOptions, l as DEFAULT_LANGUAGE, n as Espeak, o as encodeWav, p as jsdelivrDataUrl, r as EspeakError, s as toFloat32, t as DictionaryNotLoadedError, u as DataLoader } from "./core-w4y-vCu9.js";
import { readFile, readFileSync } from "node:fs";
import { promisify } from "node:util";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzip, gunzipSync } from "node:zlib";
import createEspeakModule from "../wasm/espeak-ng.js";
//#region src/node.ts
const readFileAsync = promisify(readFile);
const gunzipAsync = promisify(gunzip);
/** The data directory this package ships. */
const DATA_DIR = fileURLToPath(new URL("../espeak-ng-data/", import.meta.url));
/**
* A `DataSource` reading the packed data files from a directory on disk.
*/
function fileDataSource(dir = DATA_DIR) {
	const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
	const gzip = manifest.encoding === "gzip";
	return {
		manifest,
		read: async (file) => {
			const bytes = await readFileAsync(join(dir, file));
			return gzip ? new Uint8Array(await gunzipAsync(bytes)) : new Uint8Array(bytes);
		},
		readSync: (file) => {
			const bytes = readFileSync(join(dir, file));
			return gzip ? new Uint8Array(gunzipSync(bytes)) : new Uint8Array(bytes);
		}
	};
}
/**
* Creates a ready-to-use espeak-ng instance for Node.js.
*
* Dictionaries are read from disk the first time a voice needs them, so every
* language in espeak-ng-data works without configuration.
*/
async function createEspeak(options = {}) {
	const source = fileDataSource(options.data ?? DATA_DIR);
	const module = await createEspeakModule(moduleFactoryOptions(options.wasm));
	const loader = new DataLoader(module, source);
	await loader.loadCore();
	const languages = options.languages === "all" ? loader.availableLanguages() : ["en", ...options.languages ?? []];
	await Promise.all(languages.map((lang) => loader.loadDictionary(lang)));
	const espeakOptions = { loader };
	if (options.phonemeEvents !== void 0) espeakOptions.phonemeEvents = options.phonemeEvents;
	return Espeak.create(module, espeakOptions);
}
//#endregion
export { DATA_DIR, DATA_PATH, DEFAULT_LANGUAGE, DataLoader, DictionaryNotLoadedError, Espeak, EspeakError, VERSION, createEspeak, decode, encodeWav, fileDataSource, httpDataSource, jsdelivrDataUrl, moduleFactoryOptions, toFloat32 };

//# sourceMappingURL=node.js.map