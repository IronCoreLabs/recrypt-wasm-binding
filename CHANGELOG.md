# Changelog

## 0.5.2

+ Upgrade `recrypt-rs` to 0.8.2
+ Expose two new functions for adding or subtracting two private keys.
  + `Recrypt.addPrivateKeys(key1: Uint8Array, key2: Uint8Array): Uint8Array`
  + `Recrypt.subtractPrivateKeys(key1: Uint8Array, key2: Uint8Array): Uint8Array`

## 0.5.1

+ Upgrade all dependencies to latest version, including recrypt-rs (0.7.1).
+ Enable feature flags to use u32 backend for `ed25519-dalek`. Reduces the size of the resulting WASM binary.

## 0.4.3

+ Upgrade to the latest released version of recrypt-rs (0.6.1) to avoid depending on fork of ed25519.

## 0.4.2

+ If/when random seed is set, it's value will be cleared after use so it cannot be used as a seed for any subsequent operations.

## 0.4.1

+ Added new method `setRandomSeed(seed: Uint8Array)` that can be used to pre-seed the PRNG that is needed in order to use this library. This can be useful to support loading this WASM module in a WebWorker and also support MSEdge which doesn't allow for random number generation in a WebWorker. Without being able to pre-seed the PRNG this library would fail in MSEdge in a WebWorker. If using this random seed, it should be a 32 byte Uint8Array of random bytes and needs to be invoked before creating an instance of the `Api256` class.
+ Added a new method `pbkdf2SHA256(salt: Uint8Array, password: Uint8Array, iterations: number)` which adds support for generating a derived cryptographic key from the provided salt and password bytes. Will use SHA-256 as the hashing method to generate a 32 byte derived key based on the number of iterations provided.

## 0.4.0

Initial open source release
