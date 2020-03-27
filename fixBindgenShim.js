#!/usr/bin/env node

/**
 * wasm-bindgen shim fix script
 * ==================================
 *
 * This script is responsible for making tweaks to the auto-generated wasm-bindgen JavaScript shim that gets created when we compile our Rust
 * code. The auto-generated shim contains a few things that we need to modify before we publish this library
 *
 * ## Random Number Generation
 *
 * The shim generates code that uses the window.crypto.getRandomValues method to generate 32 bytes of random data which is used as the seed
 * that is passed into Rust to do all random number generation. For our use case however, we run this WebAssembly binary within a WebWorker. In
 * MS Edge, the WebCrypto API isn't available within WebWorkers, so this random number generation causes errors. So instead, we dynamically replace
 * the random number code with some modified code to allow callers to set the random seed manually. This exposes a `Recrypt.setRandomSeed` method
 * which can be used to manually set the random seed that is passed to the WebAssembly binary.
 *
 * ## NodeJS Random Number Call
 *
 * Because of a minor error in the auto-generated wasm-bindgen random number code, there's a uncalled function left in the shim that has a `require` call
 * in it. While this function isn't called, it does generated warnings when webpack encounters it. So we nuke out this function as it's not used anywhere
 * because we aren't in a NodeJS environment.
 */

const fs = require("fs");
const path = require("path");
const shell = require("shelljs");

//Fail this script if any of these commands fail
shell.set("-e");

//Ensure that our directory is set to the root of the repo
const rootDirectory = path.dirname(process.argv[1]);
shell.cd(`${rootDirectory}/`);

if (!process.argv[2]) {
    throw new Error("Script must take the directory of files to modify as an argument.");
}

const SOURCE_DIRECTORY = path.normalize(process.argv[2]);

/**
 * Read in the auto generated shim code, replace the method that we don't want, and write out the results back to
 * the same file.
 */
function removeNodeJSFunctions() {
    const shimJS = fs.readFileSync(`${SOURCE_DIRECTORY}/recrypt_wasm_binding.js`, "utf8");

    //Replace the entire __wbg_require and randomFillSync method that is auto generated in the output. Also tweak the lines that
    //attempt to polyfill the TextEncoder/Decoder class from Node. We automatically polyfill that already.
    const codeWithoutNode = shimJS
        .replace(/\nexport const __wbg_require_[a-f0-9]* = function[(]arg0, arg1[)] {[^}]*};\n/, "")
        .replace(/\nexport const __wbg_randomFillSync_[a-f0-9]* = function[(]arg0, arg1, arg2[)] {[^}]*};\n/, "")
        .replace(/const lTextDecoder = [^\n]*/, "")
        .replace(/const lTextEncoder = [^\n]*/, "")
        .replace(/lTextDecoder/g, "TextDecoder")
        .replace(/lTextEncoder/g, "TextEncoder");

    if (codeWithoutNode.includes("require(") || codeWithoutNode.includes("randomFillSync")) {
        throw new Error("Replacement of NodeJS import and/or randomFillSync functions failed!");
    }
    fs.writeFileSync(`${SOURCE_DIRECTORY}/recrypt_wasm_binding.js`, codeWithoutNode, "utf8");
}

/**
 * Update heap call for window.crypto to add checking for browsers where it might not exist.
 */
function replaceCryptoHeap(source) {
    // prettier-ignore
    const replacementCode =
   `const stackObj = getObject(arg0);\n \
    if (stackObj && stackObj.crypto) {\n \
        return addHeapObject(stackObj.crypto);\n \
    }\n \
    return arg0; \
`;

    const updatedSource = source.replace(/var ret = getObject[(]arg0[)].crypto;\n*\s*return addHeapObject[(]ret[)];/, replacementCode);

    if (updatedSource.includes("getObject(arg0).crypto")) {
        return Promise.reject(new Error("Replacement of window.crypto heap check failed!"));
    }
    return Promise.resolve(updatedSource);
}

/**
 * Update heap call for window.crypto.getRandomValues to add checking for browsers where it might not exist.
 */
function replaceRandomValuesHeap(source) {
    // prettier-ignore
    const replacementCode =
   `const stackObj = getObject(arg0);\n \
    if (stackObj && stackObj.getRandomValues) {\n \
        return addHeapObject(stackObj.getRandomValues);\n \
    }\n \
    return arg0; \
`;

    const updatedSource = source.replace(/var ret = getObject[(]arg0[)].getRandomValues;\n*\s*return addHeapObject[(]ret[)];/, replacementCode);

    if (updatedSource.includes("getObject(arg0).getRandomValues;")) {
        return Promise.reject(new Error("Replacement of window.crypto.getRandomValues heap check failed!"));
    }
    return Promise.resolve(updatedSource);
}

/**
 * Replace the code that actually attempts to call the crypto.getRandomValues method. Adds a new exported method which allows
 * outside callers to set a random cryptographic seed and then modifies the calling method to use the random see if set appropriately.
 */
function replaceRandomValuesCallAndAddSeedSetCall(source) {
    //prettier-ignore
    const setRandomSeedFunction =
`let randomSeed;\n\
export const setRandomSeed = (seed) => {\n\
    randomSeed = seed;\n\
}`;

    //prettier-ignore
    const getRandomValuesReplacementCode =
    `const randBuffer = getArrayU8FromWasm0(arg1, arg2);
    if(getObject(arg0) && typeof getObject(arg0).getRandomValues === "function") {
        getObject(arg0).getRandomValues(randBuffer);
    } else if(randomSeed instanceof Uint8Array && randomSeed.length >= 32) {\n\
      randBuffer.set(randomSeed.slice(0, 32), 0);\n\
      randomSeed = randomSeed.slice(32);
      if(randomSeed.length < 32){
        randomSeed = undefined;\n\
      }
    } else {\n\
       throw new Error("No source of entropy found for generating random values.");\n\
    }\n\
    `;

    const replacedSource = source
        //First replace the contents of the function to conditionally use the pre-set seed
        .replace(/getObject[(]arg0[)][.]getRandomValues[(]getArrayU8FromWasm0[(]arg1, arg2[)]{2};/, getRandomValuesReplacementCode)
        //Then add our new method which lets us optionally set the seed
        .replace(/(export const __wbg_getRandomValues_[0-9a-f]+ = function[(]arg0, arg1)/, `${setRandomSeedFunction}\n\n$1`);

    if (!replacedSource.includes("export const setRandomSeed =")) {
        return Promise.reject(new Error("Failed to add setRandomSeed function to shim!"));
    }
    if (!replacedSource.includes("randomSeed = undefined")) {
        return Promise.reject(new Error("Failed to replace __wbg_getRandomValues with getRandomValuesReplacementCode to shim!"));
    }
    return Promise.resolve(replacedSource);
}

/**
 * Replace all of the window.crypto calls to add checking and introduce support for manually setting random seed without
 * relying on window.crypto
 */
function replaceCryptoRandomCode() {
    const shimJS = fs.readFileSync(`${SOURCE_DIRECTORY}/recrypt_wasm_binding.js`, "utf8");

    replaceCryptoHeap(shimJS)
        .then(replaceRandomValuesHeap)
        .then(replaceRandomValuesCallAndAddSeedSetCall)
        .then((replacementShim) => {
            fs.writeFileSync(`${SOURCE_DIRECTORY}/recrypt_wasm_binding.js`, replacementShim, "utf8");
        })
        .catch((e) => {
            throw e;
        });
}

/**
 * Add our new method to the auto-generated TS types that get created for this module.
 */
function addNewSeedMethodToTypesFile() {
    //When building for release, we use our own types file, so we don't have/need to modify this one there.
    if (!fs.existsSync(`${SOURCE_DIRECTORY}/recrypt_wasm_binding.d.ts`)) {
        return;
    }
    const typesFile = fs.readFileSync(`${SOURCE_DIRECTORY}/recrypt_wasm_binding.d.ts`, "utf8");
    const setRandomSeedType = "export function setRandomSeed(seed: Uint8Array): void;";
    const replacedTypes = typesFile.replace(/(export function pbkdf2SHA256[(])/, `${setRandomSeedType}\n$1`);

    if (!replacedTypes.includes("setRandomSeed")) {
        throw new Error("Failed to add new method to types file!");
    }
    fs.writeFileSync(`${SOURCE_DIRECTORY}/recrypt_wasm_binding.d.ts`, replacedTypes, "utf8");
}

removeNodeJSFunctions();
replaceCryptoRandomCode();
addNewSeedMethodToTypesFile();
