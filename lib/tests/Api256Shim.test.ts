declare const chai: any;
declare const mocha: any;
declare const describe: any;
declare const it: any;
declare const after: any;

const expect = chai.expect;
//"Randomly" generated legit ED25519 keypair
//prettier-ignore
const publicSigningKey = new Uint8Array([138, 136, 227, 221, 116, 9, 241, 149, 253, 82, 219, 45, 60, 186, 93, 114, 202, 103, 9, 191, 29, 148, 18, 27, 243, 116, 136, 1, 180, 15, 111, 92]);
//prettier-ignore
const privateSigningKey = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 138, 136, 227, 221, 116, 9, 241, 149, 253, 82, 219, 45, 60, 186, 93, 114, 202, 103, 9, 191, 29, 148, 18, 27, 243, 116, 136, 1, 180, 15, 111, 92]);
mocha.setup("bdd");

//Inject mocha reporter div into the page so it has a place to display the results.
const reporterDiv = document.createElement("div");
reporterDiv.id = "mocha";
document.body.appendChild(reporterDiv);

import("../Api256Shim").then((Recrypt) => {
    const api = new Recrypt.Api256();

    describe("Recrypt", () => {
        describe("Api256", () => {
            after(() => {
                const completeDiv = document.createElement("div");
                completeDiv.id = "mocha_complete";
                document.body.appendChild(completeDiv);
            });

            describe("generateKeyPair", () => {
                it("should generate keypairs of the expected length", () => {
                    const keypairs = api.generateKeyPair();
                    expect(keypairs).to.be.a("object");
                    expect(Object.keys(keypairs)).to.have.lengthOf(2);
                    expect(keypairs.publicKey).to.be.a("object");
                    expect(keypairs.privateKey).to.be.a("Uint8Array");
                    expect(Object.keys(keypairs.publicKey)).to.have.lengthOf(2);
                    expect(keypairs.publicKey.x).to.be.a("Uint8Array");
                    expect(keypairs.publicKey.x).to.have.lengthOf(32);
                    expect(keypairs.publicKey.y).to.be.a("Uint8Array");
                    expect(keypairs.publicKey.y).to.have.lengthOf(32);
                });
            });

            describe("generateEd25519KeyPair", () => {
                it("should generate ed25519 keypairs of the expected length", () => {
                    const keypair = api.generateEd25519KeyPair();
                    expect(keypair).to.be.a("object");
                    expect(Object.keys(keypair)).to.have.lengthOf(2);
                    expect(keypair.publicKey).to.be.a("Uint8Array");
                    expect(keypair.privateKey).to.be.a("Uint8Array");

                    expect(keypair.publicKey).to.have.lengthOf(32);
                    expect(keypair.privateKey).to.have.lengthOf(64);
                });
            });

            describe("ed25519Sign", () => {
                it("should produce a valid signature", () => {
                    const keypair = api.generateEd25519KeyPair();

                    const signature = api.ed25519Sign(keypair.privateKey, new Uint8Array(20));
                    expect(signature).to.be.a("Uint8Array");
                    expect(signature).to.have.lengthOf(64);
                });
            });

            describe("ed25519Verify", () => {
                it("should roundtrip verify a signature", () => {
                    const keypair = api.generateEd25519KeyPair();
                    const signature = api.ed25519Sign(keypair.privateKey, new Uint8Array(20));

                    expect(api.ed25519Verify(keypair.publicKey, new Uint8Array(20), signature)).to.be.true;
                });

                it("should fail if message is not the same", () => {
                    const keypair = api.generateEd25519KeyPair();
                    const signature = api.ed25519Sign(keypair.privateKey, new Uint8Array(20));

                    expect(api.ed25519Verify(keypair.publicKey, new Uint8Array(10), signature)).to.be.false;

                    it("should fail if key is wrong", () => {
                        const keypair = api.generateEd25519KeyPair();
                        const failedKeyPair = api.generateEd25519KeyPair();
                        const signature = api.ed25519Sign(keypair.privateKey, new Uint8Array(20));

                        expect(api.ed25519Verify(failedKeyPair.publicKey, new Uint8Array(21), signature)).to.be.false;
                    });
                });
            });

            describe("computeEd25519PublicKey", () => {
                it("should result in expected public key", () => {
                    const keypair = api.generateEd25519KeyPair();
                    expect(api.computeEd25519PublicKey(keypair.privateKey)).to.deep.equal(keypair.publicKey);
                });
            });

            describe("generatePlaintext", () => {
                it("should generate a plaintext of the expected length", () => {
                    const plaintext = api.generatePlaintext();
                    expect(plaintext).to.be.a("Uint8Array");
                    expect(plaintext).to.have.lengthOf(384);
                    const plaintext2 = api.generatePlaintext();
                    expect(plaintext).to.not.deep.equal(plaintext2);
                });
            });

            describe("generateTransformKey", () => {
                it("should generate tramsform key with expected properties", () => {
                    const fromPrivateKey = api.generateKeyPair().privateKey;
                    const toPublicKey = api.generateKeyPair().publicKey;

                    const transformKey = api.generateTransformKey(fromPrivateKey, toPublicKey, privateSigningKey);
                    expect(transformKey).to.be.a("object");
                    expect(Object.keys(transformKey)).to.have.lengthOf(6);

                    expect(transformKey.toPublicKey).to.deep.equal(toPublicKey);
                    expect(transformKey.publicSigningKey).to.deep.equal(publicSigningKey);

                    expect(transformKey.ephemeralPublicKey).to.be.a("object");
                    expect(Object.keys(transformKey.ephemeralPublicKey)).to.have.lengthOf(2);
                    expect(transformKey.ephemeralPublicKey.x).to.be.a("Uint8Array");
                    expect(transformKey.ephemeralPublicKey.x).to.have.lengthOf(32);
                    expect(transformKey.ephemeralPublicKey.y).to.be.a("Uint8Array");
                    expect(transformKey.ephemeralPublicKey.y).to.have.lengthOf(32);

                    expect(transformKey.encryptedTempKey).to.be.a("Uint8Array");
                    expect(transformKey.encryptedTempKey).to.have.lengthOf(384);

                    expect(transformKey.hashedTempKey).to.be.a("Uint8Array");
                    expect(transformKey.hashedTempKey).to.have.lengthOf(128);

                    expect(transformKey.signature).to.be.a("Uint8Array");
                    expect(transformKey.signature).to.have.lengthOf(64);
                });
            });

            describe("computePublicKey", () => {
                it("should compute the expected private key", () => {
                    const keypair = api.generateKeyPair();
                    expect(api.computePublicKey(keypair.privateKey)).to.deep.equal(keypair.publicKey);
                });
            });

            describe("hash256", () => {
                it("should return a hash of expected size", () => {
                    const bytes = api.generatePlaintext();
                    const hash = api.hash256(bytes);
                    expect(hash).to.be.a("Uint8Array");
                    expect(hash).to.have.lengthOf(32);
                });
            });

            describe("deriveSymmetricKey", () => {
                it("should return symmetric key of expected size", () => {
                    const pt = api.generatePlaintext();
                    const symmetricKey = api.deriveSymmetricKey(pt);
                    expect(symmetricKey).to.be.a("Uint8Array");
                    expect(symmetricKey).to.have.lengthOf(32);
                });
            });

            describe("encrypt", () => {
                it("should encrypt the provided value and return an encrypted value object", () => {
                    const plaintext = api.generatePlaintext();
                    const toPublicKey = api.generateKeyPair().publicKey;
                    const encryptedVal = api.encrypt(plaintext, toPublicKey, privateSigningKey);

                    expect(encryptedVal).to.be.a("object");
                    expect(Object.keys(encryptedVal)).to.have.lengthOf(6);

                    expect(encryptedVal.ephemeralPublicKey).to.be.a("object");
                    expect(Object.keys(encryptedVal.ephemeralPublicKey)).to.have.lengthOf(2);
                    expect(encryptedVal.ephemeralPublicKey.x).to.be.a("Uint8Array");
                    expect(encryptedVal.ephemeralPublicKey.x).to.have.lengthOf(32);
                    expect(encryptedVal.ephemeralPublicKey.y).to.be.a("Uint8Array");
                    expect(encryptedVal.ephemeralPublicKey.y).to.have.lengthOf(32);

                    expect(encryptedVal.encryptedMessage).to.be.a("Uint8Array");
                    expect(encryptedVal.encryptedMessage).to.have.lengthOf(384);

                    expect(encryptedVal.authHash).to.be.a("Uint8Array");
                    expect(encryptedVal.authHash).to.have.lengthOf(32);

                    expect(encryptedVal.publicSigningKey).to.deep.equal(publicSigningKey);
                    expect(encryptedVal.publicSigningKey).to.have.lengthOf(32);

                    expect(encryptedVal.transformBlocks).to.be.a("Array");
                    expect(encryptedVal.transformBlocks).to.have.lengthOf(0);

                    expect(encryptedVal.signature).to.be.a("Uint8Array");
                    expect(encryptedVal.signature).to.have.lengthOf(64);
                });
            });

            describe("transform", () => {
                it("generates expected value for level 1 transform", () => {
                    const userKeys = api.generateKeyPair();
                    const deviceKeys = api.generateKeyPair();
                    const lvl0EncryptedValue = api.encrypt(api.generatePlaintext(), userKeys.publicKey, privateSigningKey);

                    const transformKey = api.generateTransformKey(userKeys.privateKey, deviceKeys.publicKey, privateSigningKey);
                    const lvl1EncryptedValue = api.transform(lvl0EncryptedValue, transformKey, privateSigningKey);

                    expect(lvl1EncryptedValue).to.be.a("object");
                    expect(Object.keys(lvl1EncryptedValue)).to.have.lengthOf(6);

                    expect(lvl1EncryptedValue.ephemeralPublicKey).to.be.a("object");
                    expect(Object.keys(lvl1EncryptedValue.ephemeralPublicKey)).to.have.lengthOf(2);
                    expect(lvl1EncryptedValue.ephemeralPublicKey.x).to.be.a("Uint8Array");
                    expect(lvl1EncryptedValue.ephemeralPublicKey.x).to.have.lengthOf(32);
                    expect(lvl1EncryptedValue.ephemeralPublicKey.y).to.be.a("Uint8Array");
                    expect(lvl1EncryptedValue.ephemeralPublicKey.y).to.have.lengthOf(32);

                    expect(lvl1EncryptedValue.encryptedMessage).to.be.a("Uint8Array");
                    expect(lvl1EncryptedValue.encryptedMessage).to.have.lengthOf(384);

                    expect(lvl1EncryptedValue.authHash).to.be.a("Uint8Array");
                    expect(lvl1EncryptedValue.authHash).to.have.lengthOf(32);

                    expect(lvl1EncryptedValue.publicSigningKey).to.deep.equal(publicSigningKey);
                    expect(lvl1EncryptedValue.publicSigningKey).to.have.lengthOf(32);

                    expect(lvl1EncryptedValue.signature).to.be.a("Uint8Array");
                    expect(lvl1EncryptedValue.signature).to.have.lengthOf(64);

                    expect(lvl1EncryptedValue.transformBlocks).to.be.a("Array");
                    expect(lvl1EncryptedValue.transformBlocks).to.have.lengthOf(1);

                    expect(lvl1EncryptedValue.transformBlocks[0].encryptedTempKey).to.be.a("Uint8Array");
                    expect(lvl1EncryptedValue.transformBlocks[0].encryptedTempKey).to.have.length(384);

                    expect(lvl1EncryptedValue.transformBlocks[0].randomTransformEncryptedTempKey).to.be.a("Uint8Array");
                    expect(lvl1EncryptedValue.transformBlocks[0].randomTransformEncryptedTempKey).to.have.length(384);

                    expect(lvl1EncryptedValue.transformBlocks[0].publicKey).to.be.a("object");
                    expect(Object.keys(lvl1EncryptedValue.transformBlocks[0].publicKey)).to.have.lengthOf(2);
                    expect(lvl1EncryptedValue.transformBlocks[0].publicKey.x).to.be.a("Uint8Array");
                    expect(lvl1EncryptedValue.transformBlocks[0].publicKey.x).to.have.lengthOf(32);
                    expect(lvl1EncryptedValue.transformBlocks[0].publicKey.y).to.be.a("Uint8Array");
                    expect(lvl1EncryptedValue.transformBlocks[0].publicKey.y).to.have.lengthOf(32);

                    expect(lvl1EncryptedValue.transformBlocks[0].randomTransformPublicKey).to.be.a("object");
                    expect(Object.keys(lvl1EncryptedValue.transformBlocks[0].randomTransformPublicKey)).to.have.lengthOf(2);
                    expect(lvl1EncryptedValue.transformBlocks[0].randomTransformPublicKey.x).to.be.a("Uint8Array");
                    expect(lvl1EncryptedValue.transformBlocks[0].randomTransformPublicKey.x).to.have.lengthOf(32);
                    expect(lvl1EncryptedValue.transformBlocks[0].randomTransformPublicKey.y).to.be.a("Uint8Array");
                    expect(lvl1EncryptedValue.transformBlocks[0].randomTransformPublicKey.y).to.have.lengthOf(32);
                });

                it("generates expected value for level 2 transform", () => {
                    const groupKeys = api.generateKeyPair();
                    const userKeys = api.generateKeyPair();
                    const deviceKeys = api.generateKeyPair();

                    const groupToUserTransform = api.generateTransformKey(groupKeys.privateKey, userKeys.publicKey, privateSigningKey);
                    const userToDeviceTransform = api.generateTransformKey(userKeys.privateKey, deviceKeys.publicKey, privateSigningKey);

                    const lvl0EncryptedValue = api.encrypt(api.generatePlaintext(), groupKeys.publicKey, privateSigningKey);
                    const lvl1EncryptedValue = api.transform(lvl0EncryptedValue, groupToUserTransform, privateSigningKey);
                    const lvl2EncryptedValue = api.transform(lvl1EncryptedValue, userToDeviceTransform, privateSigningKey);

                    expect(lvl2EncryptedValue).to.be.a("object");
                    expect(Object.keys(lvl2EncryptedValue)).to.have.lengthOf(6);

                    expect(lvl2EncryptedValue.ephemeralPublicKey).to.be.a("object");
                    expect(Object.keys(lvl2EncryptedValue.ephemeralPublicKey)).to.have.lengthOf(2);
                    expect(lvl2EncryptedValue.ephemeralPublicKey.x).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.ephemeralPublicKey.x).to.have.lengthOf(32);
                    expect(lvl2EncryptedValue.ephemeralPublicKey.y).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.ephemeralPublicKey.y).to.have.lengthOf(32);

                    expect(lvl2EncryptedValue.encryptedMessage).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.encryptedMessage).to.have.lengthOf(384);

                    expect(lvl2EncryptedValue.authHash).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.authHash).to.have.lengthOf(32);

                    expect(lvl2EncryptedValue.publicSigningKey).to.deep.equal(publicSigningKey);
                    expect(lvl2EncryptedValue.publicSigningKey).to.have.lengthOf(32);

                    expect(lvl2EncryptedValue.signature).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.signature).to.have.lengthOf(64);

                    expect(lvl2EncryptedValue.transformBlocks).to.be.a("Array");
                    expect(lvl2EncryptedValue.transformBlocks).to.have.lengthOf(2);

                    expect(lvl2EncryptedValue.transformBlocks[0].encryptedTempKey).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.transformBlocks[0].encryptedTempKey).to.have.length(384);

                    expect(lvl2EncryptedValue.transformBlocks[0].randomTransformEncryptedTempKey).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.transformBlocks[0].randomTransformEncryptedTempKey).to.have.length(384);

                    expect(lvl2EncryptedValue.transformBlocks[0].publicKey).to.be.a("object");
                    expect(Object.keys(lvl2EncryptedValue.transformBlocks[0].publicKey)).to.have.lengthOf(2);
                    expect(lvl2EncryptedValue.transformBlocks[0].publicKey.x).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.transformBlocks[0].publicKey.x).to.have.lengthOf(32);
                    expect(lvl2EncryptedValue.transformBlocks[0].publicKey.y).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.transformBlocks[0].publicKey.y).to.have.lengthOf(32);

                    expect(lvl2EncryptedValue.transformBlocks[0].randomTransformPublicKey).to.be.a("object");
                    expect(Object.keys(lvl2EncryptedValue.transformBlocks[0].randomTransformPublicKey)).to.have.lengthOf(2);
                    expect(lvl2EncryptedValue.transformBlocks[0].randomTransformPublicKey.x).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.transformBlocks[0].randomTransformPublicKey.x).to.have.lengthOf(32);
                    expect(lvl2EncryptedValue.transformBlocks[0].randomTransformPublicKey.y).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.transformBlocks[0].randomTransformPublicKey.y).to.have.lengthOf(32);

                    expect(lvl2EncryptedValue.transformBlocks[1].encryptedTempKey).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.transformBlocks[1].encryptedTempKey).to.have.length(384);

                    expect(lvl2EncryptedValue.transformBlocks[1].randomTransformEncryptedTempKey).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.transformBlocks[1].randomTransformEncryptedTempKey).to.have.length(384);

                    expect(lvl2EncryptedValue.transformBlocks[1].publicKey).to.be.a("object");
                    expect(Object.keys(lvl2EncryptedValue.transformBlocks[1].publicKey)).to.have.lengthOf(2);
                    expect(lvl2EncryptedValue.transformBlocks[1].publicKey.x).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.transformBlocks[1].publicKey.x).to.have.lengthOf(32);
                    expect(lvl2EncryptedValue.transformBlocks[1].publicKey.y).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.transformBlocks[1].publicKey.y).to.have.lengthOf(32);

                    expect(lvl2EncryptedValue.transformBlocks[1].randomTransformPublicKey).to.be.a("object");
                    expect(Object.keys(lvl2EncryptedValue.transformBlocks[1].randomTransformPublicKey)).to.have.lengthOf(2);
                    expect(lvl2EncryptedValue.transformBlocks[1].randomTransformPublicKey.x).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.transformBlocks[1].randomTransformPublicKey.x).to.have.lengthOf(32);
                    expect(lvl2EncryptedValue.transformBlocks[1].randomTransformPublicKey.y).to.be.a("Uint8Array");
                    expect(lvl2EncryptedValue.transformBlocks[1].randomTransformPublicKey.y).to.have.lengthOf(32);
                });
            });

            describe("decrypt roundtrip", () => {
                it("should be able to roundtrip decrypt a level 0 encrypted value", () => {
                    const plaintext = api.generatePlaintext();
                    const keys = api.generateKeyPair();
                    const lvl0EncryptedValue = api.encrypt(plaintext, keys.publicKey, privateSigningKey);
                    const decryptedPlaintext = api.decrypt(lvl0EncryptedValue, keys.privateKey);

                    expect(decryptedPlaintext).to.deep.equal(plaintext);
                });

                it("should be able to roundtrip decrypt a level 1 encrypted value", () => {
                    const plaintext = api.generatePlaintext();
                    const userKeys = api.generateKeyPair();
                    const deviceKeys = api.generateKeyPair();
                    const transformKey = api.generateTransformKey(userKeys.privateKey, deviceKeys.publicKey, privateSigningKey);
                    const lvl0EncryptedValue = api.encrypt(plaintext, userKeys.publicKey, privateSigningKey);

                    const lvl1EncryptedValue = api.transform(lvl0EncryptedValue, transformKey, privateSigningKey);

                    const decryptedPlaintext = api.decrypt(lvl1EncryptedValue, deviceKeys.privateKey);

                    expect(decryptedPlaintext).to.deep.equal(plaintext);
                });

                it("should be able to roundtrip decrypt a level 2 encrypted value", (done: () => void) => {
                    const plaintext = api.generatePlaintext();
                    const groupKeys = api.generateKeyPair();
                    const userKeys = api.generateKeyPair();
                    const deviceKeys = api.generateKeyPair();
                    const groupToUserTransform = api.generateTransformKey(groupKeys.privateKey, userKeys.publicKey, privateSigningKey);
                    const userToDeviceTransform = api.generateTransformKey(userKeys.privateKey, deviceKeys.publicKey, privateSigningKey);

                    const lvl0EncryptedValue = api.encrypt(plaintext, groupKeys.publicKey, privateSigningKey);
                    const lvl1EncryptedValue = api.transform(lvl0EncryptedValue, groupToUserTransform, privateSigningKey);
                    const lvl2EncryptedValue = api.transform(lvl1EncryptedValue, userToDeviceTransform, privateSigningKey);

                    const decryptedPlaintext = api.decrypt(lvl2EncryptedValue, deviceKeys.privateKey);

                    expect(decryptedPlaintext).to.deep.equal(plaintext);
                    done();
                });

                it("should throw an Error instance if decrypt fails", (done: () => void) => {
                    const plaintext = api.generatePlaintext();
                    const encryptKeys = api.generateKeyPair();
                    const decryptKeys = api.generateKeyPair();
                    const lvl0EncryptedValue = api.encrypt(plaintext, encryptKeys.publicKey, privateSigningKey);

                    try {
                        api.decrypt(lvl0EncryptedValue, decryptKeys.privateKey);
                    } catch (e) {
                        expect(e).to.be.a("Error");
                        expect((e as any).message).to.be.string;
                        expect((e as any).message).not.to.have.lengthOf(0);
                        done();
                    }
                });
            });

            describe("schnorrSign", () => {
                it("should sign the provided bytes and return the expected signature", () => {
                    const keys = api.generateKeyPair();
                    const message = new Uint8Array(20);

                    const signature = api.schnorrSign(keys.privateKey, keys.publicKey, message);
                    expect(signature).to.be.a("Uint8Array");
                    expect(signature).to.have.lengthOf(64);
                });
            });

            describe("schnorrVerify", () => {
                it("should verify the provided signed signature", () => {
                    const keys = api.generateKeyPair();
                    const falseKeys = api.generateKeyPair();

                    const message = new Uint8Array(20);

                    const signature = api.schnorrSign(keys.privateKey, keys.publicKey, message);

                    expect(api.schnorrVerify(keys.publicKey, undefined, message, signature)).to.be.true;
                    expect(api.schnorrVerify(keys.publicKey, null as any, message, signature)).to.be.true;

                    expect(api.schnorrVerify(falseKeys.publicKey, undefined, message, signature)).to.be.false;
                });

                it("should verify that passing in augmented private key works", () => {
                    const userKeys = api.generateKeyPair();
                    const serverKeys = api.generateKeyPair();
                    const message = new Uint8Array(20);

                    const augmentedPublicKey = Recrypt.augmentPublicKey256(userKeys.publicKey, serverKeys.publicKey);

                    const signature = api.schnorrSign(userKeys.privateKey, augmentedPublicKey, message);

                    expect(api.schnorrVerify(augmentedPublicKey, serverKeys.privateKey, message, signature)).to.be.true;
                });
            });
        });

        describe("EncryptedSearch", () => {
            const encSearch = new Recrypt.EncryptedSearch();
            describe("generateHashesForString", () => {
                it("generates valid hashes for string", () => {
                    const queryResult1 = encSearch.generateHashesForString("ironcore labs", new Uint8Array([1]), "red");
                    const queryResult2 = encSearch.generateHashesForString("ironcore laps", new Uint8Array([1]), "red");
                    const queryResult3 = encSearch.generateHashesForString("ironcore labs", new Uint8Array([1]), "bed");
                    const queryResult4 = encSearch.generateHashesForString("ironcore labs", new Uint8Array([2]), "red");

                    expect(queryResult1).to.be.a("Uint32Array");
                    expect(queryResult1).to.have.lengthOf(8);
                    expect(queryResult1).not.to.deep.equal(queryResult2);
                    expect(queryResult1).not.to.deep.equal(queryResult3);
                    expect(queryResult1).not.to.deep.equal(queryResult4);
                });
            });
            describe("generateHashesForStringWithPadding", () => {
                it("generates more hashes than without padding", () => {
                    const queryResult = encSearch.generateHashesForString("ironcore labs", new Uint8Array([1]), undefined);
                    const dataResult = encSearch.generateHashesForStringWithPadding("ironcore labs", new Uint8Array([1]), undefined);

                    expect(dataResult).to.have.length.be.above(8);
                    expect(Array.from(dataResult)).to.include.members(Array.from(queryResult));
                });
            });

            describe("transliterateSTring", () => {
                it("converts string to expected latinization", () => {
                    expect(Recrypt.EncryptedSearch.transliterateString("Gumby, dammit!")).to.equal("gumby dammit");
                    expect(Recrypt.EncryptedSearch.transliterateString("北亰")).to.equal("bei jing ");
                    expect(Recrypt.EncryptedSearch.transliterateString("Æneid")).to.equal("aeneid");
                });
            });
        });

        describe("transformKeyToBytes256", () => {
            it("converts a transform key into bytes", () => {
                const fromPrivateKey = api.generateKeyPair().privateKey;
                const toPublicKey = api.generateKeyPair().publicKey;

                const transformKey = api.generateTransformKey(fromPrivateKey, toPublicKey, privateSigningKey);

                const transformKeyBytes = Recrypt.transformKeyToBytes256(transformKey);
                expect(transformKeyBytes).to.be.a("Uint8Array");
                expect(transformKeyBytes).to.have.lengthOf(672);
            });
        });

        describe("augmentTransformKey256", () => {
            it("returns an augmented transform key", () => {
                const fromPrivateKey = api.generateKeyPair().privateKey;
                const toPublicKey = api.generateKeyPair().publicKey;
                const augPrivateKey = api.generateKeyPair().privateKey;

                const transformKey = api.generateTransformKey(fromPrivateKey, toPublicKey, privateSigningKey);

                const augTransformKey = Recrypt.augmentTransformKey256(transformKey, augPrivateKey);

                expect(augTransformKey).to.be.a("object");
                expect(Object.keys(augTransformKey)).to.have.lengthOf(6);

                expect(augTransformKey.toPublicKey).to.deep.equal(toPublicKey);
                expect(augTransformKey.publicSigningKey).to.deep.equal(publicSigningKey);

                expect(augTransformKey.ephemeralPublicKey).to.be.a("object");
                expect(Object.keys(augTransformKey.ephemeralPublicKey)).to.have.lengthOf(2);
                expect(augTransformKey.ephemeralPublicKey.x).to.be.a("Uint8Array");
                expect(augTransformKey.ephemeralPublicKey.x).to.have.lengthOf(32);
                expect(augTransformKey.ephemeralPublicKey.y).to.be.a("Uint8Array");
                expect(augTransformKey.ephemeralPublicKey.y).to.have.lengthOf(32);

                expect(augTransformKey.encryptedTempKey).to.be.a("Uint8Array");
                expect(augTransformKey.encryptedTempKey).to.have.lengthOf(384);

                expect(augTransformKey.hashedTempKey).to.be.a("Uint8Array");
                expect(augTransformKey.hashedTempKey).to.have.lengthOf(128);

                expect(augTransformKey.signature).to.be.a("Uint8Array");
                expect(augTransformKey.signature).to.have.lengthOf(64);
            });
        });

        describe("augmentPublicKey256", () => {
            it("augments the provided public key", () => {
                const pub1 = api.generateKeyPair().publicKey;
                const pub2 = api.generateKeyPair().publicKey;

                const augPublicKey = Recrypt.augmentPublicKey256(pub1, pub2);

                expect(augPublicKey).to.be.a("object");
                expect(Object.keys(augPublicKey)).to.have.lengthOf(2);
                expect(augPublicKey.x).to.be.a("Uint8Array");
                expect(augPublicKey.x).to.have.lengthOf(32);
                expect(augPublicKey.y).to.be.a("Uint8Array");
                expect(augPublicKey.y).to.have.lengthOf(32);

                expect(augPublicKey).not.to.deep.equal(pub1);
            });
        });

        describe("addPrivateKeys", () => {
            it("provides expected value when keys are added", () => {
                //prettier-ignore
                const key1 = new Uint8Array([1, 2, 0, 221, 116, 9, 241, 149, 253, 82, 219, 45, 60, 186, 93, 114, 202, 103, 9, 191, 29, 148, 18, 27, 243, 116, 136, 1, 180, 1, 1, 0]);
                //prettier-ignore
                const key2 = new Uint8Array([1, 1, 1, 104, 32, 121, 170, 221, 21, 229, 188, 159, 140, 164, 44, 173, 30, 151, 210, 60, 34, 10, 160, 186, 168, 36, 102, 174, 64, 0, 0, 1]);
                expect(Recrypt.addPrivateKeys(key1, key2)).to.deep.equal(
                    //prettier-ignore
                    new Uint8Array([2, 3, 2, 69, 148, 131, 156, 115, 19, 56, 151, 204, 201, 94, 138, 31, 232, 254, 219, 251, 63, 158, 178, 214, 155, 152, 238, 175, 244, 1, 1, 1])
                );
            });
        });

        describe("subtractPrivateKeys", () => {
            it("provides expected values when keys are subtracted", () => {
                //prettier-ignore
                const key1 = new Uint8Array([1, 2, 0, 221, 116, 9, 241, 149, 253, 82, 219, 45, 60, 186, 93, 114, 202, 103, 9, 191, 29, 148, 18, 27, 243, 116, 136, 1, 180, 1, 1, 0]);
                //prettier-ignore
                const key2 = new Uint8Array([1, 1, 1, 104, 32, 121, 170, 221, 21, 229, 188, 159, 140, 164, 44, 173, 30, 151, 210, 60, 34, 10, 160, 186, 168, 36, 102, 174, 64, 0, 0, 1]);
                expect(Recrypt.subtractPrivateKeys(key1, key2)).to.deep.equal(
                    //prettier-ignore
                    new Uint8Array([0, 0, 255, 117, 83, 144, 70, 184, 231, 109, 30, 141, 176, 22, 48, 197, 171, 207, 55, 130, 251, 137, 113, 97, 75, 80, 33, 83, 116, 1, 0, 255])
                );
            });
        });
    });
    mocha.checkLeaks();
    mocha.run();
});
