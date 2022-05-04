# Recrypt WebAssembly Binding

[![Build Status](https://travis-ci.org/IronCoreLabs/recrypt-wasm-binding.svg?branch=main)](https://travis-ci.org/IronCoreLabs/recrypt-wasm-binding)
[![NPM Version](https://badge.fury.io/js/%40ironcorelabs%2Frecrypt-wasm-binding.svg)](https://www.npmjs.com/package/@ironcorelabs/recrypt-wasm-binding)

This repository contains bindings to allow [Recrypt](<(https://github.com/IronCoreLabs/recrypt-rs)>) to be used as a WebAssembly module within the browser. It depends on [recrypt-rs](https://github.com/IronCoreLabs/recrypt-rs) as a dependency and contains shims both in Rust and JS to marshal data between WebAssembly and JavaScript. The bindings are generated using [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen).

## Install

```bash
npm install @ironcorelabs/recrypt-wasm-binding
```

## Examples

The following examples show how to use this library from a browser-based web application. This library will need to be loaded with a module bundler such as [webpack](https://webpack.js.org) in order to correctly handle importing of ES6 modules and to properly load and instantiate the WebAssembly module. This module will also need to be loaded asynchronously if used via webpack. Refer to the [webpack.config.js](webpack.config.js) file which shows how this module is loaded for benchmarks and unit tests which are both run within the browser.

### Basic Encrypt/Decrypt Example

```js
import * as Recrypt from "@ironcorelabs/recrypt-wasm-binding";

//Create a new Recrypt API instance
const Api256 = new Recrypt.Api256();

//Generate both a user key pair and a signing key pair
const keys = Api256.generateKeyPair();
const signingKeys = Api256.generateEd25519KeyPair();

//Generate a plaintext to encrypt
const plaintext = Api256.generatePlaintext();

//Encrypt the data to the public key and then attempt to decrypt with the private key
const encryptedValue = Api256.encrypt(plaintext, keys.publicKey, signingKeys.privateKey);
const decryptedValue = Api256.decrypt(encryptedValue, keys.privateKey);

decryptedValue === plaintext; //true
```

### Single-hop Transform Encryption Example

```js
import * as Recrypt from "@ironcorelabs/recrypt-wasm-binding";

//Create a new Recrypt API instance
const Api256 = new Recrypt.Api256();

//Generate both a user key pair and a signing key pair
const userKeys = Api256.generateKeyPair();
const signingKeys = Api256.generateEd25519KeyPair();

//Generate a plaintext to encrypt
const plaintext = Api256.generatePlaintext();

//Encrypt the data to the user public key
const encryptedValue = Api256.encrypt(plaintext, userKeys.publicKey, signingKeys.privateKey);

//Generate a second public/private key pair as the target of the transform. This will allow the encrypted data to be
//transformed to this second key pair and allow it to be decrypted.
const deviceKeys = Api256.generateKeyPair();

//Generate a transform key from the user private key to the device public key
const userToDeviceTransformKey = Api256.generateTransformKey(userKeys.privateKey, deviceKeys.publicKey, signingKeys.privateKey);

//Transform the encrypted data (without decrypting it!) so that it can be decrypted with the second key pair
const transformedEncryptedValue = Api256.transform(encryptedValue, userToDeviceTransformKey, signingKeys.privateKey);

//Decrypt the data using the second private key
const decryptedValue = Api256.decrypt(transformedEncryptedValue, deviceKeys.privateKey);

decryptedValue === plaintext; //true
```

## Types

This library contains a [TypeScript definitions](index.d.ts) file which shows the available classes and methods.

## Local Environment Setup

A few things are required as dependencies locally before you're able to run the benchmarks and unit tests for this library.

-   [Install Rust](https://www.rust-lang.org/en-US/install.html). You must have Rust installed in order to compile the Rust bindings to WASM
-   Proper Rust target: Run `rustup target add wasm32-unknown-unknown` to add the `wasm32-unknown-unknown` target to Rust which is required to compile to WASM.
-   Install `wasm-bindgen` via `cargo install wasm-bindgen-cli`.
-   Run `yarn` from the root of this repo to install all JS dependencies.

## Compiling WebAssembly Module

Run the `yarn compile` to compile the Rust code and generate a WASM module. The resulting `.wasm` file and wasm-bindgen shim will be generated in the `target` directory. By default we compile in release mode. Compiling is required before running either the unit tests or benchmarks below.

## Benchmarks

Make sure you run `yarn compile` first.

In order to run the benchmarks in the browser you can run `yarn benchmark`. This will startup a webpack server at [http://localhost:8080](http://localhost:8080) which when opened will automatically start running the unit tests and display the results to the screen and developer console.

## Unit Tests

Make sure you run `yarn compile` first.

Unit tests can be run in two ways

-   `yarn test` will run the tests via the command line via Chrome Headless and report the results at the end.
-   `yarn testInBrowser` will startup a webpack server at [http://localhost:8080](http://localhost:8080) which you can visit to see the results of the test within the browser directly.

## License

Recrypt-wasm-binding is licensed under the [GNU Affero General Public License](LICENSE). We also offer commercial licenses - [email](mailto:info@ironcorelabs.com) for more information.

Copyright (c) 2021 IronCore Labs, Inc. All rights reserved.
