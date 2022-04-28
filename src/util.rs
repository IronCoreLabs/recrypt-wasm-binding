#![allow(non_snake_case)]
use recrypt::{
    api::{
        AuthHash, Ed25519Signature, EncryptedMessage, EncryptedTempKey, EncryptedValue,
        HashedValue, PrivateKey, PublicKey, PublicSigningKey, SigningKeypair, TransformBlock,
        TransformKey,
    },
    nonemptyvec::NonEmptyVec,
};

//Error handling to make it so we can get actual Error instances out of WASM when methods throw with actual messages
pub type JsError = wasm_bindgen::prelude::JsValue;
pub struct WasmError<E> {
    error: E,
}

impl<E> WasmError<E> {
    pub fn new(error: E) -> WasmError<E> {
        WasmError { error }
    }
}
impl<E: core::fmt::Display> From<WasmError<E>> for JsError {
    fn from(error: WasmError<E>) -> JsError {
        js_sys::Error::new(&format!("{}", error.error)[..]).into()
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct JsPublicKey {
    pub x: Vec<u8>,
    pub y: Vec<u8>,
}

#[derive(Serialize)]
pub struct JsKeyPair {
    pub privateKey: [u8; 32],
    pub publicKey: JsPublicKey,
}

#[derive(Serialize)]
pub struct JsSigningKeyPair {
    pub privateKey: Vec<u8>,
    pub publicKey: Vec<u8>,
}

#[derive(Serialize, Deserialize)]
pub struct JsTransformKey {
    pub encryptedTempKey: Vec<u8>,
    pub ephemeralPublicKey: JsPublicKey,
    pub hashedTempKey: Vec<u8>,
    pub publicSigningKey: Vec<u8>,
    pub signature: Vec<u8>,
    pub toPublicKey: JsPublicKey,
}

#[derive(Deserialize, Serialize)]
pub struct JsTransformBlock {
    publicKey: JsPublicKey,
    encryptedTempKey: Vec<u8>,
    randomTransformPublicKey: JsPublicKey,
    randomTransformEncryptedTempKey: Vec<u8>,
}

#[derive(Serialize, Deserialize)]
pub struct JsEncryptedValue {
    pub authHash: Vec<u8>,
    pub encryptedMessage: Vec<u8>,
    pub ephemeralPublicKey: JsPublicKey,
    pub publicSigningKey: Vec<u8>,
    pub signature: Vec<u8>,
    pub transformBlocks: Vec<JsTransformBlock>,
}

/**
 * Macro to generate methods to convert various slice types (slices, vectors) into fixed length arrays of
 * varying length.
 */
macro_rules! slice_to_fixed_bytes { ($($fn_name: ident, $slice_type: ty, $n: expr); *) => {
    $(pub fn $fn_name(slice: $slice_type, field_name: &str) -> [u8; $n]{
        if slice.len() != $n {
            panic!(
                "Provided value for '{}' is not of expected size of {} bytes. Instead got {} bytes.",
                field_name,
                $n,
                slice.len()
            );
        }
        let mut fixed_length: [u8; $n] = [0; $n];
        fixed_length.copy_from_slice(slice);
        fixed_length
    })+
}}

// Use the macro to generate the various fixed length array types
slice_to_fixed_bytes! {
    slice_to_fixed_32_bytes, &[u8], 32;
    slice_to_fixed_64_bytes, &[u8], 64;
    slice_to_fixed_384_bytes, &[u8], 384;
    vector_to_fixed_32_bytes, &Vec<u8>, 32;
    vector_to_fixed_64_bytes, &Vec<u8>, 64;
    vector_to_fixed_128_bytes, &Vec<u8>, 128;
    vector_to_fixed_384_bytes, &Vec<u8>, 384
}

/**
 * Convert a Recrypt public key into a JsPublicKey which will be exported back
 * to JS as an object with x/y properties as Uint8Arrays.
 */
pub fn public_key_to_js_object(public_key: PublicKey) -> JsPublicKey {
    let (x, y) = public_key.bytes_x_y();
    JsPublicKey {
        x: x.to_vec(),
        y: y.to_vec(),
    }
}

/**
 * Convert a public and private keypair into a serializable KeyPair struct which will be exported to JS
 */
pub fn key_pair_to_js_object(private_key: PrivateKey, public_key: PublicKey) -> JsKeyPair {
    JsKeyPair {
        privateKey: *private_key.bytes(),
        publicKey: public_key_to_js_object(public_key),
    }
}

/**
 * Convert a signing key pair into a serializable JsSigningKeyPair struct which will be exported to JS
 */
pub fn signing_keys_to_js_object(signing_key_pair: SigningKeypair) -> JsSigningKeyPair {
    JsSigningKeyPair {
        privateKey: signing_key_pair.bytes().to_vec(),
        publicKey: signing_key_pair.public_key().bytes().to_vec(),
    }
}

/**
 * Convert a JsPublicKey object into an internal Recrypt PublicKey
 */
pub fn js_object_to_public_key(public_key_obj: &JsPublicKey) -> Result<PublicKey, JsError> {
    Ok(PublicKey::new((
        vector_to_fixed_32_bytes(&public_key_obj.x, "publicKey.x"),
        vector_to_fixed_32_bytes(&public_key_obj.y, "publicKey.y"),
    ))
    .map_err(WasmError::new)?)
}

/**
 * Convert an incoming JsTransformKey from the JS struct into an internal TransformKey instance
 */
pub fn js_object_to_transform_key(js_object: JsTransformKey) -> Result<TransformKey, JsError> {
    Ok(TransformKey::new(
        js_object_to_public_key(&js_object.ephemeralPublicKey)?,
        js_object_to_public_key(&js_object.toPublicKey)?,
        EncryptedTempKey::new(vector_to_fixed_384_bytes(
            &js_object.encryptedTempKey,
            "encryptedTempKey",
        )),
        HashedValue::new(vector_to_fixed_128_bytes(
            &js_object.hashedTempKey,
            "hashedTempKey",
        ))
        .map_err(WasmError::new)?,
        PublicSigningKey::new(vector_to_fixed_32_bytes(
            &js_object.publicSigningKey,
            "publicSigningKey",
        )),
        Ed25519Signature::new(vector_to_fixed_64_bytes(&js_object.signature, "signature")),
    ))
}

/**
 * Convert a TransformKey struct into a serializable transform key struct which will be exported to JS
 */
pub fn transform_key_to_js_object(transform_key: TransformKey) -> JsTransformKey {
    JsTransformKey {
        toPublicKey: public_key_to_js_object(*transform_key.to_public_key()),
        ephemeralPublicKey: public_key_to_js_object(*transform_key.ephemeral_public_key()),
        encryptedTempKey: transform_key.encrypted_temp_key().bytes().to_vec(),
        hashedTempKey: transform_key.hashed_temp_key().bytes().to_vec(),
        publicSigningKey: transform_key.public_signing_key().bytes().to_vec(),
        signature: transform_key.signature().bytes().to_vec(),
    }
}

/**
 * Convert an array of JsTransformBlocks into a non-empty vector of internal recrypt TransformBlock structs
 */
pub fn js_object_to_transform_blocks(
    js_object: Vec<JsTransformBlock>,
) -> Result<NonEmptyVec<TransformBlock>, JsError> {
    let blocks: Result<Vec<TransformBlock>, JsError> = js_object
        .iter()
        .map(|block| {
            Ok(TransformBlock::new(
                &js_object_to_public_key(&block.publicKey)?,
                &EncryptedTempKey::new(vector_to_fixed_384_bytes(
                    &block.encryptedTempKey,
                    "transformBlock.encryptedTempKey",
                )),
                &js_object_to_public_key(&block.randomTransformPublicKey)?,
                &EncryptedTempKey::new(vector_to_fixed_384_bytes(
                    &block.randomTransformEncryptedTempKey,
                    "transformBlock.randomTransformEncryptedTempKey",
                )),
            )
            .map_err(WasmError::new)?)
        })
        .collect();

    blocks.and_then(|transform_blocks| {
        Ok(NonEmptyVec::try_from(&transform_blocks).map_err(WasmError::new)?)
    })
}

/**
 * Iterate through the provided internal TransformBlocks and convert each block to an external JSTransformBlock.
 */
pub fn transform_blocks_to_js_object(
    transform_blocks: Vec<TransformBlock>,
) -> Vec<JsTransformBlock> {
    transform_blocks
        .iter()
        .map(|block| JsTransformBlock {
            publicKey: public_key_to_js_object(*block.public_key()),
            encryptedTempKey: block.encrypted_temp_key().bytes().to_vec(),
            randomTransformPublicKey: public_key_to_js_object(*block.random_transform_public_key()),
            randomTransformEncryptedTempKey: block
                .encrypted_random_transform_temp_key()
                .bytes()
                .to_vec(),
        })
        .collect()
}

/**
 * Convert an incoming JsEncryptedValue into an internal recrypt EncryptedValue instance
 */
pub fn js_object_to_encrypted_value(
    js_object: JsEncryptedValue,
) -> Result<EncryptedValue, JsError> {
    let ephemeral_public_key = js_object_to_public_key(&js_object.ephemeralPublicKey)?;
    let encrypted_message = EncryptedMessage::new(vector_to_fixed_384_bytes(
        &js_object.encryptedMessage,
        "encryptedMessage",
    ));
    let auth_hash = AuthHash::new(vector_to_fixed_32_bytes(&js_object.authHash, "authHash"));
    let public_signing_key = PublicSigningKey::new(vector_to_fixed_32_bytes(
        &js_object.publicSigningKey,
        "publicSigningKey",
    ));
    let signature =
        Ed25519Signature::new(vector_to_fixed_64_bytes(&js_object.signature, "signature"));

    let encrypted_value = if js_object.transformBlocks.len() > 0 {
        let transform_blocks = js_object_to_transform_blocks(js_object.transformBlocks)?;
        EncryptedValue::TransformedValue {
            ephemeral_public_key,
            encrypted_message,
            auth_hash,
            public_signing_key,
            signature,
            transform_blocks,
        }
    } else {
        EncryptedValue::EncryptedOnceValue {
            ephemeral_public_key,
            encrypted_message,
            auth_hash,
            public_signing_key,
            signature,
        }
    };
    Ok(encrypted_value)
}

/**
 * Convert an EncryptedValue sturct into a serializable JS transform key struct which will be exported to JS
 */
pub fn encrypted_value_to_js_object(encrypted_value: EncryptedValue) -> JsEncryptedValue {
    let encrypted_value_tuple = match encrypted_value {
        EncryptedValue::EncryptedOnceValue {
            ephemeral_public_key,
            encrypted_message,
            auth_hash,
            public_signing_key,
            signature,
        } => (
            ephemeral_public_key,
            encrypted_message,
            auth_hash,
            public_signing_key,
            signature,
            vec![],
        ),
        EncryptedValue::TransformedValue {
            ephemeral_public_key,
            encrypted_message,
            auth_hash,
            public_signing_key,
            signature,
            transform_blocks,
        } => (
            ephemeral_public_key,
            encrypted_message,
            auth_hash,
            public_signing_key,
            signature,
            transform_blocks.to_vec(),
        ),
    };

    JsEncryptedValue {
        ephemeralPublicKey: public_key_to_js_object(encrypted_value_tuple.0),
        encryptedMessage: (encrypted_value_tuple.1).bytes().to_vec(),
        authHash: encrypted_value_tuple.2.bytes().to_vec(),
        publicSigningKey: encrypted_value_tuple.3.bytes().to_vec(),
        signature: encrypted_value_tuple.4.bytes().to_vec(),
        transformBlocks: transform_blocks_to_js_object(encrypted_value_tuple.5),
    }
}
