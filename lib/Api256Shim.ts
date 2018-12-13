import {PublicKey, EncryptedValue, TransformKey, TransformBlock, PrivateKey} from "../recrypt_wasm_binding";
import * as Recrypt from "../target/recrypt_wasm_binding";

/**
 * Convert a public key with Uint8Array values into a public key with normal array values. This is used to pass bytes into
 * WASM as it can't deserialize complex objects with Uint8Arrays.
 */
function publicKeyBytesToArray(publicKey: {x: Uint8Array; y: Uint8Array}) {
    return {
        x: Array.from(publicKey.x),
        y: Array.from(publicKey.y),
    };
}

/**
 * Convert a public key object with array values into a public key object with Uint8Arrays. This is used for data coming out
 * of WASM as it can't serialize objects with Uint8Arrays as values.
 */
function publicKeyArrayToBytes(publicKey: {x: number[]; y: number[]}): PublicKey {
    return {
        x: new Uint8Array(publicKey.x),
        y: new Uint8Array(publicKey.y),
    };
}

/**
 * Convert the provided TransformKey object with Uint8Array fields into the same object shape with normal array fields
 */
function transformKeyBytesToArray(transformKey: TransformKey) {
    return {
        encryptedTempKey: Array.from(transformKey.encryptedTempKey),
        ephemeralPublicKey: publicKeyBytesToArray(transformKey.ephemeralPublicKey),
        hashedTempKey: Array.from(transformKey.hashedTempKey),
        publicSigningKey: Array.from(transformKey.publicSigningKey),
        signature: Array.from(transformKey.signature),
        toPublicKey: publicKeyBytesToArray(transformKey.toPublicKey),
    };
}

/**
 * Convert the provided TransformKey object with array fields into the same object shape with Uint8Array fields
 */
function transformKeyArrayToBytes(transformKey: any): TransformKey {
    return {
        toPublicKey: publicKeyArrayToBytes(transformKey.toPublicKey),
        ephemeralPublicKey: publicKeyArrayToBytes(transformKey.ephemeralPublicKey),
        encryptedTempKey: new Uint8Array(transformKey.encryptedTempKey),
        hashedTempKey: new Uint8Array(transformKey.hashedTempKey),
        publicSigningKey: new Uint8Array(transformKey.publicSigningKey),
        signature: new Uint8Array(transformKey.signature),
    };
}

/**
 * JS shim that is necessary to convert types between the marshaling layer of Rust. Currently wasm-bindgen doens't support the ability to pass
 * objects with Uint8Array properties (see https://github.com/rustwasm/wasm-bindgen/issues/779). This makes the API for Rust not ideal so we created
 * this wrapper class in order to make the public interface for consumers more reasonable. The shim functions here convert Uint8Arrays that are part
 * of objects going in to normal arrays (which can be successfully serialized) as well as converting array values coming out of Rust from normal arrays
 * into Uint8Arrays.
 */
export class Api256 extends Recrypt.Api256 {
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
    generateKeyPair() {
        const {privateKey, publicKey} = super.generateKeyPair();
        return {
            privateKey: new Uint8Array(privateKey),
            publicKey: publicKeyArrayToBytes(publicKey),
        };
    }

    /**
     * Generate an ed25519 signing key pair.
     */
    generateEd25519KeyPair() {
        const {privateKey, publicKey} = super.generateEd25519KeyPair();
        return {
            privateKey: new Uint8Array(privateKey),
            publicKey: new Uint8Array(publicKey),
        };
    }

    /**
     * Generate a transform key from the provided private key to the provided public key.
     */
    generateTransformKey(fromPrivateKey: Uint8Array, toPublicKey: PublicKey, privateSigningKey: Uint8Array): TransformKey {
        const transformKey = super.generateTransformKey(fromPrivateKey, publicKeyBytesToArray(toPublicKey), privateSigningKey);
        return transformKeyArrayToBytes(transformKey);
    }

    /**
     * Compute the associated public key for the provided private key bytes.
     */
    computePublicKey(privateKey: Uint8Array) {
        return publicKeyArrayToBytes(super.computePublicKey(privateKey));
    }

    /**
     * Encrypt the provided plaintext to the provided public key. Signs the resulting encrypted value with the provided signing key pair. Returns a
     * complex object of encrypted data which can be directly passed into decrypt.
     */
    encrypt(plaintext: Uint8Array, toPublicKey: PublicKey, privateSigningKey: Uint8Array): EncryptedValue {
        const encryptedValue = super.encrypt(plaintext, publicKeyBytesToArray(toPublicKey), privateSigningKey);
        return this.encryptedValueArrayToBytes(encryptedValue);
    }

    /**
     * Transform the provided EncryptedValue using the provided TransformKey. Signs the resulting encrypted value with the provided signing key pair. Returns
     * a new EncryptedValue with another level of transformBlocks in it.
     */
    transform(encryptedValue: EncryptedValue, transformKey: TransformKey, privateSigningKey: Uint8Array): EncryptedValue {
        const transformedEncryptedValue = super.transform(
            this.encryptedValueBytesToArray(encryptedValue),
            transformKeyBytesToArray(transformKey),
            privateSigningKey
        );

        return this.encryptedValueArrayToBytes(transformedEncryptedValue);
    }

    /**
     * Decrypt the provided encrypted value using the provided private key and return the decrypted plaintext bytes as a Uint8Array.
     */
    decrypt(encryptedValue: EncryptedValue, privateKey: Uint8Array) {
        return super.decrypt(this.encryptedValueBytesToArray(encryptedValue), privateKey);
    }

    /**
     * Sign the provided message with the provided keypair using Schnorr signing. Returns a 64 byte signature.
     */
    schnorrSign(privateKey: Uint8Array, publicKey: PublicKey, message: Uint8Array) {
        return super.schnorrSign(privateKey, publicKeyBytesToArray(publicKey), message);
    }

    /**
     * Verify the provided signature can be validated using the provide raw message along with the associated public key as
     * well as the optional augmented private key.
     *
     */
    schnorrVerify(publicKey: PublicKey, augmentedPrivateKey: Uint8Array | undefined, message: Uint8Array, signature: Uint8Array) {
        return super.schnorrVerify(publicKeyBytesToArray(publicKey), augmentedPrivateKey as Uint8Array, message, signature);
    }
}

/**
 * Convert the provided TransformKey object into a single Uint8Array of bytes in a consistent order
 */
export function transformKeyToBytes256(transformKey: TransformKey) {
    return Recrypt.transformKeyToBytes256(transformKeyBytesToArray(transformKey));
}

/**
 * Augment the provided transform key object with the provided private key. Returns a new, augmented TransformKey
 */
export function augmentTransformKey256(transformKey: TransformKey, privateKey: PrivateKey) {
    const augmentedTransformKey = Recrypt.augmentTransformKey256(transformKeyBytesToArray(transformKey), privateKey);
    return transformKeyArrayToBytes(augmentedTransformKey);
}

/**
 * Augment the provided public key object with another public key object. Returns the augmented PublicKey.
 */
export function augmentPublicKey256(currentPublicKey: PublicKey, otherPublicKey: PublicKey) {
    const augmentedKey = Recrypt.augmentPublicKey256(publicKeyBytesToArray(currentPublicKey), publicKeyBytesToArray(otherPublicKey));
    return publicKeyArrayToBytes(augmentedKey);
}
