import generateKeyPair from "./generateKeyPair";
import generateEd25519KeyPair from "./generateEd25519KeyPair";
import generatePlaintext from "./generatePlaintext";
import generateTransformKey from "./generateTransformKey";
import computePublicKey from "./computePublicKey";
import deriveSymmetricKey from "./deriveSymmetricKey";
import encrypt from "./encrypt";
import transformLevelOne from "./transformLevelOne";
import transformLevelTwo from "./transformLevelTwo";
import decryptLevelZero from "./decryptLevelZero";
import decryptLevelOne from "./decryptLevelOne";
import decryptLevelTwo from "./decryptLevelTwo";

const resultsDiv = document.createElement("div");
document.body.appendChild(resultsDiv);

/**
 * Log results benchmark to screen so users don't have to open the console to see results
 */
function logBenchmarkResult(result: string) {
    const resultUI = document.createElement("div");
    resultUI.innerHTML = result;
    resultsDiv.appendChild(document.createElement("br"));
    resultsDiv.appendChild(resultUI);
}

import("../lib/Api256Shim").then((Recrypt) => {
    logBenchmarkResult("Starting Benchmarks");
    const genKeyPairBenchmark = generateKeyPair(Recrypt, logBenchmarkResult);
    const genEd25519KeyPairbenchmark = generateEd25519KeyPair(Recrypt, logBenchmarkResult);
    const genPlaintextBenchmark = generatePlaintext(Recrypt, logBenchmarkResult);
    const genTransformKeyBenchmark = generateTransformKey(Recrypt, logBenchmarkResult);
    const computePublicKeyBenchmark = computePublicKey(Recrypt, logBenchmarkResult);
    const deriveSymmetricKeyBenchmark = deriveSymmetricKey(Recrypt, logBenchmarkResult);
    const encryptBenchmark = encrypt(Recrypt, logBenchmarkResult);
    const transformLevelOneBenchmark = transformLevelOne(Recrypt, logBenchmarkResult);
    const transformLevelTwoBenchmark = transformLevelTwo(Recrypt, logBenchmarkResult);
    const decryptLevelZeroBenchmark = decryptLevelZero(Recrypt, logBenchmarkResult);
    const decryptLevelOneBenchmark = decryptLevelOne(Recrypt, logBenchmarkResult);
    const decryptLevelTwoBenchmark = decryptLevelTwo(Recrypt, logBenchmarkResult);

    genKeyPairBenchmark.on("complete", () => {
        genEd25519KeyPairbenchmark.run({async: true});
    });

    genEd25519KeyPairbenchmark.on("complete", () => {
        genPlaintextBenchmark.run({async: true});
    });

    genPlaintextBenchmark.on("complete", () => {
        genTransformKeyBenchmark.run({async: true});
    });

    genTransformKeyBenchmark.on("complete", () => {
        computePublicKeyBenchmark.run({async: true});
    });

    computePublicKeyBenchmark.on("complete", () => {
        deriveSymmetricKeyBenchmark.run({async: true});
    });

    deriveSymmetricKeyBenchmark.on("complete", () => {
        encryptBenchmark.run({async: true});
    });

    encryptBenchmark.on("complete", () => {
        transformLevelOneBenchmark.run({async: true});
    });

    transformLevelOneBenchmark.on("complete", () => {
        transformLevelTwoBenchmark.run({async: true});
    });

    transformLevelTwoBenchmark.on("complete", () => {
        decryptLevelZeroBenchmark.run({async: true});
    });

    decryptLevelZeroBenchmark.on("complete", () => {
        decryptLevelOneBenchmark.run({async: true});
    });

    decryptLevelOneBenchmark.on("complete", () => {
        decryptLevelTwoBenchmark.run({async: true});
    });

    decryptLevelTwoBenchmark.on("complete", () => {
        logBenchmarkResult("Benchmark Complete");
    });

    genKeyPairBenchmark.run({async: true});
});
