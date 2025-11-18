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
 */

const fs = require("fs");
const path = require("path");
const shell = require("shelljs");

//Fail this script if any of these commands fail
shell.set("-e");

//Ensure that our directory is set to the root of the repo
const rootDirectory = path.dirname(process.argv[1]);
shell.cd(`${rootDirectory}/`);

//Cleanup the previous build, if it exists
shell.rm("-rf", "./pkg");

//Cleanup any previous Rust builds, update deps, and compile
shell.exec("yarn");
shell.exec("cargo clean");
shell.exec("cargo update");
shell.exec("cargo install wasm-pack");
shell.exec("cargo install wasm-bindgen-cli@0.2.104"); // version must be kept in-sync with Cargo.toml
shell.exec("yarn run compile");
shell.exec("yarn test");
shell.exec("PATH=~/.cargo/bin:$PATH yarn run pack");

//wasm-pack generates a .gitignore file with '*' that ends up causing not all of our published content to get pushed out, delete it and instead
//use an empty .npmignore file so that NPM publishes everything within the directory
shell.exec("rm ./pkg/.gitignore");
fs.writeFileSync("./pkg/.npmignore", "");

//Move our manually written TS types into the distribution folder
shell.cp("./recrypt_wasm_binding.d.ts", "./pkg");

//Compile our wasm-bindgen shim from TS to ES6 JS
shell.exec(
    "./node_modules/typescript/bin/tsc --lib es6 --target ES2015 --sourceMap false --module esnext --skipLibCheck true --outDir ./pkg lib/Api256Shim.ts"
);
//Tweak wasm-bindgen import location since we moved the file to the same directory as the wasm-bindgen produced shim
// WARNING: if the above module type changes to nodenext from esnext, this will go from an import to a require
//  and will need to be updated.
const before = shell.exec(`shasum ./pkg/Api256Shim.js`, {silent: true}).stdout;
shell.sed("-i", `from "../target/`, `from "./`, "./pkg/Api256Shim.js");
const after = shell.exec(`shasum ./pkg/Api256Shim.js`, {silent: true}).stdout;
if (before === after) {
    console.error("Error: failed to correct Api256Shim.js wasm import.");
    process.exit(1);
}

//We need to tweak the wasm-pack generated package.json file since we have our own shim that fronts wasm-bindgen
const generatedPackageJson = require("./pkg/package.json");
generatedPackageJson.main = "Api256Shim.js";
delete generatedPackageJson.type;
delete generatedPackageJson.files;
generatedPackageJson.types = "recrypt_wasm_binding.d.ts";

try {
    fs.writeFileSync("./pkg/package.json", JSON.stringify(generatedPackageJson, null, 2));
    console.log("File written successfully");
} catch (err) {
    console.error("Write failed:", err);
    process.exit(1);
}

shell.cp("./LICENSE", "./pkg");
