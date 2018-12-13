#!/usr/bin/env node

/**
 * recrypt-wasm-binding build and NPM publish script
 * ==================================
 *
 * This script is responsible for compiling and building the NPM release bundle for this repo. The following steps are taken:
 *
 * + Clean up any existing Rust builds by running `cargo clean`.
 * + Run `cargo update` to make sure all dependencies are available.
 * + Run wasm-pack to compile Rust and generate published package.json script.
 * + Run unit tests to ensure the library is in good shape for publishing.
 * + TypeScript compile the API shim file
 * + Make any tweaks to the distribution directory (/pkg) to add shim and types file.
 * + Do a dry run of npm publishing or perform an actual publish step if `--publish` option is provided.
 */

const fs = require("fs");
const path = require("path");
const shell = require("shelljs");

//Fail this script if any of these commands fail
shell.set("-e");

//Ensure that our directory is set to the root of the repo
const rootDirectory = path.dirname(process.argv[1]);
shell.cd(`${rootDirectory}/`);
const shouldPublish = process.argv.slice(2).indexOf("--publish") !== -1;

//Cleanup the previous build, if it exists
shell.rm("-rf", "./pkg");

//Cleanup any previous Rust builds, update deps, and compile
shell.exec("yarn");
shell.exec("cargo clean");
shell.exec("cargo update");
shell.exec("yarn run compile");
shell.exec("yarn test");
shell.exec("yarn run pack");

//Move our manually written TS types into the distribution folder
shell.cp("./recrypt_wasm_binding.d.ts", "./pkg");

//Compile our wasm-bindgen shim from TS to ES6 JS
shell.exec("./node_modules/typescript/bin/tsc --lib es6 --target ES2015 --sourceMap false --module esnext --outDir ./pkg lib/Api256Shim.ts");
//Tweak wasm-bindgen import location since we moved the file to the same directory as the wasm-bindgen produced shim
shell.sed("-i", `from "../target/`, `from "./`, "./pkg/Api256Shim.js");
//wasm-bindgen with the rand crate incorrectly adds an inert function that tries to do a require call for node. This function
//isn't used or called anywhere but causes a warning in webpack. So manually remove the `require` line to avoid that.
shell.sed("-i", "return addHeapObject[(]require[(]varg0[)][)];", "", "./pkg/recrypt_wasm_binding.js");

//We need to tweak the wasm-pack generated package.json file since we have our own shim that fronts wasm-bindgen
const generatedPackageJson = require("./pkg/package.json");
generatedPackageJson.main = "Api256Shim.js";
delete generatedPackageJson.module;
delete generatedPackageJson.files;
generatedPackageJson.types = "recrypt_wasm_binding.d.ts";

fs.writeFileSync("./pkg/package.json", JSON.stringify(generatedPackageJson, null, 2));

shell.cp("./LICENSE", "./pkg");

shell.pushd("./pkg");

shell.exec(
    shouldPublish ? `git tag ${generatedPackageJson.version} && git push origin ${generatedPackageJson.version}` : "echo No git tag generated during dry run"
);

shell.exec(shouldPublish ? "npm publish --access private" : "npm publish --dry-run");

shell.popd();
