import {EncryptedValue, KeyPair, PrivateKey, PublicKey, SigningKeyPair, TransformBlock, TransformKey} from "../recrypt_wasm_binding";
import * as Recrypt from "../target/recrypt_wasm_binding";

/**
 * Convert a public key with Uint8Array values into a public key with normal array values. This is used to pass bytes into
 * WASM as it can't deserialize complex objects with Uint8Arrays.
 */
const publicKeyBytesToArray = (publicKey: {x: Uint8Array; y: Uint8Array}) => ({
    x: Array.from(publicKey.x),
    y: Array.from(publicKey.y),
});

/**
 * Convert a public key object with array values into a public key object with Uint8Arrays. This is used for data coming out
 * of WASM as it can't serialize objects with Uint8Arrays as values.
 */
const publicKeyArrayToBytes = (publicKey: {x: number[]; y: number[]}): PublicKey => ({
    x: new Uint8Array(publicKey.x),
    y: new Uint8Array(publicKey.y),
});

/**
 * Convert the provided TransformKey object with Uint8Array fields into the same object shape with normal array fields
 */
const transformKeyBytesToArray = (transformKey: TransformKey) => ({
    encryptedTempKey: Array.from(transformKey.encryptedTempKey),
    ephemeralPublicKey: publicKeyBytesToArray(transformKey.ephemeralPublicKey),
    hashedTempKey: Array.from(transformKey.hashedTempKey),
    publicSigningKey: Array.from(transformKey.publicSigningKey),
    signature: Array.from(transformKey.signature),
    toPublicKey: publicKeyBytesToArray(transformKey.toPublicKey),
});

/**
 * Convert the provided TransformKey object with array fields into the same object shape with Uint8Array fields
 */
const transformKeyArrayToBytes = (transformKey: any): TransformKey => ({
    toPublicKey: publicKeyArrayToBytes(transformKey.toPublicKey),
    ephemeralPublicKey: publicKeyArrayToBytes(transformKey.ephemeralPublicKey),
    encryptedTempKey: new Uint8Array(transformKey.encryptedTempKey),
    hashedTempKey: new Uint8Array(transformKey.hashedTempKey),
    publicSigningKey: new Uint8Array(transformKey.publicSigningKey),
    signature: new Uint8Array(transformKey.signature),
});

/**
 * JS shim that is necessary to convert types between the marshaling layer of Rust. Currently wasm-bindgen doens't support the ability to pass
 * objects with Uint8Array properties (see https://github.com/rustwasm/wasm-bindgen/issues/779). This makes the API for Rust not ideal so we created
 * this wrapper class in order to make the public interface for consumers more reasonable. The shim functions here convert Uint8Arrays that are part
 * of objects going in to normal arrays (which can be successfully serialized) as well as converting array values coming out of Rust from normal arrays
 * into Uint8Arrays.
 */
export class Api256 {
    private api: Recrypt.Api256;

    constructor() {
        this.api = new Recrypt.Api256();
    }

    /**
     * Map over each incoming transform block and convert the byte values into normal arrays so they can be passed into WASM.
     */
    private transformBlocksBytesToArray(transformBlocks: TransformBlock[]) {
        return transformBlocks.map((block) => ({
            publicKey: publicKeyBytesToArray(block.publicKey),
            encryptedTempKey: Array.from(block.encryptedTempKey),
            randomTransformPublicKey: publicKeyBytesToArray(block.randomTransformPublicKey),
            randomTransformEncryptedTempKey: Array.from(block.randomTransformEncryptedTempKey),
        }));
    }

    /**
     * Map over each outgoing transform block and convert the normal arrays into Uint8Arrays before passing back out
     * to the caller.
     */
    private transformBlocksArrayToBytes(transformBlocks: any): TransformBlock[] {
        return transformBlocks.map((block: any) => ({
            publicKey: publicKeyArrayToBytes(block.publicKey),
            encryptedTempKey: new Uint8Array(block.encryptedTempKey),
            randomTransformPublicKey: publicKeyArrayToBytes(block.randomTransformPublicKey),
            randomTransformEncryptedTempKey: new Uint8Array(block.randomTransformEncryptedTempKey),
        }));
    }

    /**
     * Convert an incoming EncryptedValue from Uint8Array values into simple arrays in order to pass it into Rust via wasm-bindgen.
     */
    private encryptedValueBytesToArray(encryptedValue: EncryptedValue) {
        return {
            ephemeralPublicKey: publicKeyBytesToArray(encryptedValue.ephemeralPublicKey),
            encryptedMessage: Array.from(encryptedValue.encryptedMessage),
            authHash: Array.from(encryptedValue.authHash),
            publicSigningKey: Array.from(encryptedValue.publicSigningKey),
            signature: Array.from(encryptedValue.signature),
            transformBlocks: this.transformBlocksBytesToArray(encryptedValue.transformBlocks),
        };
    }

    /**
     * Convert an EncryptedValue coming from WASM into Uint8Arrays before passing it out to the API consumer.
     */
    private encryptedValueArrayToBytes(encryptedValue: any): EncryptedValue {
        return {
            ephemeralPublicKey: publicKeyArrayToBytes(encryptedValue.ephemeralPublicKey),
            encryptedMessage: new Uint8Array(encryptedValue.encryptedMessage),
            authHash: new Uint8Array(encryptedValue.authHash),
            publicSigningKey: new Uint8Array(encryptedValue.publicSigningKey),
            signature: new Uint8Array(encryptedValue.signature),
            transformBlocks: this.transformBlocksArrayToBytes(encryptedValue.transformBlocks),
        };
    }

    /**
     * Generate a Recrypt public and private key pair. Returns results as Uint8Arrays.
     */
    generateKeyPair(): KeyPair {
        const {privateKey, publicKey} = this.api.generateKeyPair();
        return {
            privateKey: new Uint8Array(privateKey),
            publicKey: publicKeyArrayToBytes(publicKey),
        };
    }

    /**
     * Generate an ed25519 signing key pair.
     */
    generateEd25519KeyPair(): SigningKeyPair {
        const {privateKey, publicKey} = this.api.generateEd25519KeyPair();
        return {
            privateKey: new Uint8Array(privateKey),
            publicKey: new Uint8Array(publicKey),
        };
    }

    /**
     * Sign the provided message with the provided ed25519 private key.
     */
    ed25519Sign(privateSigningKey: Uint8Array, message: Uint8Array): Uint8Array {
        return this.api.ed25519Sign(privateSigningKey, message);
    }

    /**
     * Verify that the provided signature matches the provided message and was signed with the private key associated to the provided public signing key
     */
    ed25519Verify(publicSigningKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean {
        return this.api.ed25519Verify(publicSigningKey, message, signature);
    }

    /**
     * Compute an ed25519 public key given its private key.
     */
    computeEd25519PublicKey(privateSigningKey: Uint8Array): Uint8Array {
        return this.api.computeEd25519PublicKey(privateSigningKey);
    }

    /**
     * Generate a new Recrypt plaintext
     */
    generatePlaintext(): Uint8Array {
        return this.api.generatePlaintext();
    }

    /**
     * Generate a transform key from the provided private key to the provided public key.
     */
    generateTransformKey(fromPrivateKey: Uint8Array, toPublicKey: PublicKey, privateSigningKey: Uint8Array): TransformKey {
        const transformKey = this.api.generateTransformKey(fromPrivateKey, publicKeyBytesToArray(toPublicKey), privateSigningKey);
        return transformKeyArrayToBytes(transformKey);
    }

    /**
     * Compute the associated public key for the provided private key bytes.
     */
    computePublicKey(privateKey: Uint8Array): PublicKey {
        return publicKeyArrayToBytes(this.api.computePublicKey(privateKey));
    }

    /**
     * Encrypt the provided plaintext to the provided public key. Signs the resulting encrypted value with the provided signing key pair. Returns a
     * complex object of encrypted data which can be directly passed into decrypt.
     */
    encrypt(plaintext: Uint8Array, toPublicKey: PublicKey, privateSigningKey: Uint8Array): EncryptedValue {
        const encryptedValue = this.api.encrypt(plaintext, publicKeyBytesToArray(toPublicKey), privateSigningKey);
        return this.encryptedValueArrayToBytes(encryptedValue);
    }

    /**
     * Transform the provided EncryptedValue using the provided TransformKey. Signs the resulting encrypted value with the provided signing key pair. Returns
     * a new EncryptedValue with another level of transformBlocks in it.
     */
    transform(encryptedValue: EncryptedValue, transformKey: TransformKey, privateSigningKey: Uint8Array): EncryptedValue {
        const transformedEncryptedValue = this.api.transform(
            this.encryptedValueBytesToArray(encryptedValue),
            transformKeyBytesToArray(transformKey),
            privateSigningKey
        );

        return this.encryptedValueArrayToBytes(transformedEncryptedValue);
    }

    /**
     * Decrypt the provided encrypted value using the provided private key and return the decrypted plaintext bytes as a Uint8Array.
     */
    decrypt(encryptedValue: EncryptedValue, privateKey: Uint8Array): Uint8Array {
        return this.api.decrypt(this.encryptedValueBytesToArray(encryptedValue), privateKey);
    }

    /**
     * Derive the 32 byte symmetric key from the provided plaintext.
     */
    deriveSymmetricKey(plaintext: Uint8Array): Uint8Array {
        return this.api.deriveSymmetricKey(plaintext);
    }

    /**
     * Sign the provided message with the provided keypair using Schnorr signing. Returns a 64 byte signature.
     */
    schnorrSign(privateKey: Uint8Array, publicKey: PublicKey, message: Uint8Array): Uint8Array {
        return this.api.schnorrSign(privateKey, publicKeyBytesToArray(publicKey), message);
    }

    /**
     * Verify the provided signature can be validated using the provide raw message along with the associated public key as
     * well as the optional augmented private key.
     *
     */
    schnorrVerify(publicKey: PublicKey, augmentedPrivateKey: Uint8Array | undefined, message: Uint8Array, signature: Uint8Array): boolean {
        return this.api.schnorrVerify(publicKeyBytesToArray(publicKey), augmentedPrivateKey as Uint8Array, message, signature);
    }

    /**
     * SHA256 hash the provided bytes
     */
    hash256(bytes: Uint8Array): Uint8Array {
        return this.api.hash256(bytes);
    }
}

/**
 * Convert the provided TransformKey object into a single Uint8Array of bytes in a consistent order
 */
export const transformKeyToBytes256 = (transformKey: TransformKey): Uint8Array => Recrypt.transformKeyToBytes256(transformKeyBytesToArray(transformKey));

/**
 * Augment the provided transform key object with the provided private key. Returns a new, augmented TransformKey
 */
export const augmentTransformKey256 = (transformKey: TransformKey, privateKey: PrivateKey): TransformKey =>
    transformKeyArrayToBytes(Recrypt.augmentTransformKey256(transformKeyBytesToArray(transformKey), privateKey));

/**
 * Augment the provided public key object with another public key object. Returns the augmented PublicKey.
 */
export const augmentPublicKey256 = (currentPublicKey: PublicKey, otherPublicKey: PublicKey): PublicKey => {
    const augmentedKey = Recrypt.augmentPublicKey256(publicKeyBytesToArray(currentPublicKey), publicKeyBytesToArray(otherPublicKey));
    return publicKeyArrayToBytes(augmentedKey);
};

/**
 * Create a new private key by adding together the provided private keys.
 */
export const addPrivateKeys = (privateKeyA: Uint8Array, privateKeyB: Uint8Array): Uint8Array => Recrypt.addPrivateKeys(privateKeyA, privateKeyB);

/**
 * Create a new private key by subtracting the provided private keys.
 */
export const subtractPrivateKeys = (privateKeyA: Uint8Array, privateKeyB: Uint8Array): Uint8Array => Recrypt.subtractPrivateKeys(privateKeyA, privateKeyB);


/**
 * Export the entire EncryptedSearch struct out directly. No need to shim this at any level.
 */
export const EncryptedSearch = Recrypt.EncryptedSearch;
