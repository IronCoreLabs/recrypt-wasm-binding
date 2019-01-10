# Changelog

## 0.4.1

+ Added new method `setRandomSeed(seed: Uint8Array)` that can be used to pre-seed the PRNG that is needed in order to use this library. This can be useful to support loading this WASM module in a WebWorker and also support MSEdge which doesn't allow for random number generation in a WebWorker. Without being able to pre-seed the PRNG this library would fail in MSEdge in a WebWorker. If using this random seed, it should be a 32 byte Uint8Array of random bytes and needs to be invoked before creating an instance of the `Api256` class.
+ Added a new method `pbkdf2SHA256(salt: Uint8Array, password: Uint8Array, iterations: number)` which adds support for generating a derived cryptographic key from the provided salt and password bytes. Will use SHA-256 as the hashing method to generate a 32 byte derived key based on the number of iterations provided.

## 0.4.0

Initial open source release