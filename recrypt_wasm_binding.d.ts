export type PrivateKey = Uint8Array;
export type PublicSigningKey = Uint8Array;
export type PrivateSigningKey = Uint8Array;
export type Signature = Uint8Array;
export type Plaintext = Uint8Array;
export interface PublicKey {
    x: Uint8Array;
    y: Uint8Array;
}
export interface KeyPair {
    publicKey: PublicKey;
    privateKey: PrivateKey;
}
export interface SigningKeyPair {
    publicKey: PublicSigningKey;
    privateKey: PrivateSigningKey;
}
export interface TransformBlock {
    publicKey: PublicKey;
    encryptedTempKey: Uint8Array;
    randomTransformPublicKey: PublicKey;
    randomTransformEncryptedTempKey: Uint8Array;
}
export interface EncryptedValue {
    ephemeralPublicKey: PublicKey;
    encryptedMessage: Uint8Array;
    authHash: Uint8Array;
    transformBlocks: TransformBlock[];
    publicSigningKey: PublicSigningKey;
    signature: Uint8Array;
}
export interface TransformKey {
    ephemeralPublicKey: PublicKey;
    toPublicKey: PublicKey;
    encryptedTempKey: Uint8Array;
    hashedTempKey: Uint8Array;
    publicSigningKey: PublicSigningKey;
    signature: Uint8Array;
}
export class Api256 {
    constructor();
    generateKeyPair(): KeyPair;
    generateEd25519KeyPair(): SigningKeyPair;
    ed25519Sign(signingPrivateKey: Uint8Array, message: Uint8Array): Signature;
    ed25519Verify(signingPublicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean;
    computeEd25519PublicKey(signingPrivateKey: Uint8Array): PublicSigningKey;
    generatePlaintext(): Plaintext;
    generateTransformKey(fromPrivateKey: PrivateKey, toPublicKey: PublicKey, privateSigningKey: PrivateSigningKey): TransformKey;
    computePublicKey(privateKey: PrivateKey): PublicKey;
    hash256(hashableBytes: Uint8Array): Uint8Array;
    deriveSymmetricKey(plaintext: Plaintext): Uint8Array;
    encrypt(plaintext: Plaintext, toPublicKey: PublicKey, privateSigningKey: PrivateSigningKey): EncryptedValue;
    transform(encryptedValue: EncryptedValue, transformKey: TransformKey, privateSigningKey: PrivateSigningKey): EncryptedValue;
    decrypt(encryptedValue: EncryptedValue, privateKey: PrivateKey): Plaintext;
    schnorrSign(privateKey: Uint8Array, publicKey: PublicKey, message: Uint8Array): Signature;
    schnorrVerify(publicKey: PublicKey, augmentedPrivateKey: Uint8Array | undefined, message: Uint8Array, signature: Signature): boolean;
}
export class EncryptedSearch {
    constructor();
    generateHashesForString(s: string, salt: Uint8Array, partitionId?: string): Uint32Array;
    generateHashesForStringWithPadding(s: string, salt: Uint8Array, partitionId?: string): Uint32Array;
    static transliterateString(s: string): string;
}
export function transformKeyToBytes256(transformKey: TransformKey): Uint8Array;
export function augmentTransformKey256(transformKey: TransformKey, privateKey: PrivateKey): TransformKey;
export function augmentPublicKey256(currentPublicKey: PublicKey, otherPublicKey: PublicKey): PublicKey;
export function addPrivateKeys(privateKeyA: Uint8Array, privateKeyB: Uint8Array): Uint8Array;
export function subtractPrivateKeys(privateKeyA: Uint8Array, privateKeyB: Uint8Array): Uint8Array;
