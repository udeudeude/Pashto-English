import { i as moduleFactoryOptions } from "./core-w4y-vCu9.js";
import createEspeakModule from "../wasm/espeak-ng.legacy.js";
import instantiate from "../wasm/espeak-ng.legacy.wasm.js";
//#region src/wasm2js.ts
/** Hands the glue the wasm2js exports where it expects a wasm instance. */
const instantiateWasm = (imports, receiveInstance) => {
	receiveInstance({ exports: instantiate(imports) });
	return {};
};
/**
* Instantiates the module without WebAssembly. It has the same functions as
* the wasm module and works with `DataLoader` and `Espeak.create` the same
* way, with synthesis about seven times slower. `locateFile` is ignored:
* there is no file to locate.
*/
function createWasm2jsModule(options = moduleFactoryOptions()) {
	const { printErr } = options;
	return createEspeakModule(printErr ? {
		instantiateWasm,
		printErr
	} : { instantiateWasm });
}
//#endregion
export { createWasm2jsModule };

//# sourceMappingURL=wasm2js.js.map