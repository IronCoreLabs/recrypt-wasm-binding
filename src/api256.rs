#![allow(non_snake_case)]

use crate::util::{self, JsError, WasmError};
use gloo_utils::format::JsValueSerdeExt;
use ironcore_search_helpers::{
    generate_hashes_for_string, generate_hashes_for_string_with_padding, transliterate_string,
};
use rand::{rngs::adapter::ReseedingRng, SeedableRng};
use recrypt::{
    api::{
        DefaultRng, Ed25519, Ed25519Signature, Hashable, Plaintext, PrivateKey, PublicSigningKey,
        RandomBytes, Recrypt, SchnorrSignature, Sha256, Sha256Hashing, SigningKeypair,
    },
    prelude::*,
};
use std::sync::Mutex;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Api256 {
    api: Recrypt<Sha256, Ed25519, RandomBytes<DefaultRng>>,
}

#[wasm_bindgen]
impl Api256 {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Api256 {
        Api256 {
            api: Recrypt::new(),
        }
    }

    /**
     * Generate a new Recrypt key pair with both a public and private key and return both
     * as Uint8Arrays.
     */
    pub fn generateKeyPair(&mut self) -> Result<JsValue, JsError> {
        let (priv_key, pub_key) = self.api.generate_key_pair().map_err(WasmError::new)?;
        Ok(
            JsValue::from_serde(&util::key_pair_to_js_object(priv_key, pub_key))
                .map_err(WasmError::new)?,
        )
    }

    /**
     * Generate and return an ed25519 signing public and private key.
     */
    pub fn generateEd25519KeyPair(&mut self) -> Result<JsValue, JsError> {
        let signing_key_pair = self.api.generate_ed25519_key_pair();
        Ok(
            JsValue::from_serde(&util::signing_keys_to_js_object(signing_key_pair))
                .map_err(WasmError::new)?,
        )
    }

    /**
     * Sign the provided variable length message with the provided signing private key. Returns a 64 byte signature.
     */
    pub fn ed25519Sign(
        &mut self,
        signing_private_key: &[u8],
        message: &[u8],
    ) -> Result<Vec<u8>, JsError> {
        let signing_key_pair = SigningKeypair::from_bytes(&util::slice_to_fixed_64_bytes(
            signing_private_key,
            "privateSigningKey",
        ))
        .map_err(WasmError::new)?;
        Ok(signing_key_pair.sign(&message.to_vec()).bytes().to_vec())
    }

    /**
     * Verify the provided signature given the signing public key and the message to verify. Returns a boolean of whether the message was verified.
     */
    pub fn ed25519Verify(
        &mut self,
        signing_public_key: &[u8],
        message: &[u8],
        signature: &[u8],
    ) -> bool {
        let public_signing_key = PublicSigningKey::new(util::slice_to_fixed_32_bytes(
            signing_public_key,
            "publicSigningKey",
        ));
        public_signing_key.verify(
            &message.to_vec(),
            &Ed25519Signature::new(util::slice_to_fixed_64_bytes(signature, "signature")),
        )
    }

    /**
     * Compute an ed25519 signing public key given the signing private key.
     */
    pub fn computeEd25519PublicKey(
        &mut self,
        signing_private_key: &[u8],
    ) -> Result<Vec<u8>, JsError> {
        let signing_key_pair = SigningKeypair::from_bytes(&util::slice_to_fixed_64_bytes(
            signing_private_key,
            "privateSigningKey",
        ))
        .map_err(WasmError::new)?;
        Ok(signing_key_pair.public_key().bytes().to_vec())
    }

    /**
     * Generate a new Recrypt plaintext and return it as a Uint8Array.
     */
    pub fn generatePlaintext(&mut self) -> Vec<u8> {
        self.api.gen_plaintext().bytes().to_vec()
    }

    /**
     * Generate a transform key from the provided private key to the provided public key and use the provided signing key pair. Returns
     * a JsObject which contains all the necessary keys for the transform key as Uint8Arrays.
     */
    pub fn generateTransformKey(
        &mut self,
        from_private_key: &[u8],
        to_public_key: &JsValue,
        private_signing_key: &[u8],
    ) -> Result<JsValue, JsError> {
        let to_public_key_obj: util::JsPublicKey =
            to_public_key.into_serde().map_err(WasmError::new)?;

        let transform_key = self
            .api
            .generate_transform_key(
                &PrivateKey::new(util::slice_to_fixed_32_bytes(
                    from_private_key,
                    "privateKey",
                )),
                &util::js_object_to_public_key(&to_public_key_obj)?,
                &SigningKeypair::from_bytes(&util::slice_to_fixed_64_bytes(
                    private_signing_key,
                    "privateSigningKey",
                ))
                .map_err(WasmError::new)?,
            )
            .map_err(WasmError::new)?;

        Ok(
            JsValue::from_serde(&util::transform_key_to_js_object(transform_key))
                .map_err(WasmError::new)?,
        )
    }

    /**
     * Compute the private key for the provided public key. Returns a public key object in x/y form.
     */
    pub fn computePublicKey(&mut self, private_key: &[u8]) -> Result<JsValue, JsError> {
        let computed_public_key = self
            .api
            .compute_public_key(&PrivateKey::new(util::slice_to_fixed_32_bytes(
                private_key,
                "privateKey",
            )))
            .map_err(WasmError::new)?;
        Ok(
            JsValue::from_serde(&util::public_key_to_js_object(computed_public_key))
                .map_err(WasmError::new)?,
        )
    }

    /**
     * Hash the incoming bytes to _exactly_ 32 bytes. Useful for generating PrivateKeys, among other things.
     */
    pub fn hash256(&mut self, hashable_bytes: &[u8]) -> Vec<u8> {
        Sha256.hash(&hashable_bytes.to_vec()).to_vec()
    }

    /**
     * Derives a symmetric key from the provided plaintext.
     */
    pub fn deriveSymmetricKey(&mut self, plaintext: &[u8]) -> Vec<u8> {
        let symmetric_key =
            self.api
                .derive_symmetric_key(&Plaintext::new(util::slice_to_fixed_384_bytes(
                    plaintext,
                    "plaintext",
                )));
        symmetric_key.bytes().to_vec()
    }

    /**
     * Encrypt the provided plaintext to the provided public key. Use the provided signing key pair to sign the encrypted value. Returns
     * a complex object which can be passed into the decrypt function to get the provided plaintext back.
     */
    pub fn encrypt(
        &mut self,
        plaintext: &[u8],
        to_public_key: &JsValue,
        private_signing_key: &[u8],
    ) -> Result<JsValue, JsError> {
        let to_public_key_obj: util::JsPublicKey =
            to_public_key.into_serde().map_err(WasmError::new)?;

        let encrypted_value = self
            .api
            .encrypt(
                &Plaintext::new(util::slice_to_fixed_384_bytes(plaintext, "plaintext")),
                &util::js_object_to_public_key(&to_public_key_obj)?,
                &SigningKeypair::from_bytes(&util::slice_to_fixed_64_bytes(
                    private_signing_key,
                    "privateSigningKey",
                ))
                .map_err(WasmError::new)?,
            )
            .map_err(WasmError::new)?;

        Ok(
            JsValue::from_serde(&util::encrypted_value_to_js_object(encrypted_value))
                .map_err(WasmError::new)?,
        )
    }

    /**
     * Transform the provided EncryptedValue JS object using the provided TransformKey JS object. Returns a transformed
     * EncryptedValue. Use the provided signing key pair to sign the encrypted value.
     */
    pub fn transform(
        &mut self,
        encrypted_value: &JsValue,
        transform_key: &JsValue,
        private_signing_key: &[u8],
    ) -> Result<JsValue, JsError> {
        let encrypted_value_js: util::JsEncryptedValue =
            encrypted_value.into_serde().map_err(WasmError::new)?;
        let transform_key_js: util::JsTransformKey =
            transform_key.into_serde().map_err(WasmError::new)?;

        let transformed_encrypted_value = self
            .api
            .transform(
                util::js_object_to_encrypted_value(encrypted_value_js)?,
                util::js_object_to_transform_key(transform_key_js)?,
                &SigningKeypair::from_bytes(&util::slice_to_fixed_64_bytes(
                    private_signing_key,
                    "privateSigningKey",
                ))
                .map_err(WasmError::new)?,
            )
            .map_err(WasmError::new)?;

        Ok(JsValue::from_serde(&util::encrypted_value_to_js_object(
            transformed_encrypted_value,
        ))
        .map_err(WasmError::new)?)
    }

    /**
     * Decrypt the provided encrypted value object using the provided private key. Returns the encrypted plaintext bytes as a Uint8Array.
     */
    pub fn decrypt(
        &self,
        encrypted_value: &JsValue,
        private_key: &[u8],
    ) -> Result<Vec<u8>, JsError> {
        let encrypted_value_js: util::JsEncryptedValue =
            encrypted_value.into_serde().map_err(WasmError::new)?;

        let decrypted_value = self
            .api
            .decrypt(
                util::js_object_to_encrypted_value(encrypted_value_js)?,
                &PrivateKey::new(util::slice_to_fixed_32_bytes(private_key, "privateKey")),
            )
            .map_err(WasmError::new)?;

        Ok(decrypted_value.bytes().to_vec())
    }

    /**
     * Schnorr sign the provided message using the provided public and private key. Returns a 64-byte signature.
     */
    pub fn schnorrSign(
        &mut self,
        private_key: &[u8],
        public_key_obj: &JsValue,
        message: &[u8],
    ) -> Result<Vec<u8>, JsError> {
        let public_key: util::JsPublicKey = public_key_obj.into_serde().map_err(WasmError::new)?;

        let signature = self.api.schnorr_sign(
            &PrivateKey::new(util::slice_to_fixed_32_bytes(private_key, "privateKey")),
            &util::js_object_to_public_key(&public_key)?,
            &message.to_vec(),
        );
        Ok(signature.bytes().to_vec())
    }

    /**
     * Verify the provided signature is valid by providing the public key, augmented private key, and original signed message content. Returns
     * a boolean that denotes if the signature was verified.
     */
    pub fn schnorrVerify(
        &mut self,
        public_key_obj: &JsValue,
        augmented_private_key: Option<Vec<u8>>,
        message: &[u8],
        signature: &[u8],
    ) -> Result<bool, JsError> {
        let public_key: util::JsPublicKey = public_key_obj.into_serde().map_err(WasmError::new)?;

        Ok(self.api.schnorr_verify(
            &util::js_object_to_public_key(&public_key)?,
            augmented_private_key
                .map(|v| PrivateKey::new(util::vector_to_fixed_32_bytes(&v, "augmentedPrivateKey")))
                .as_ref(),
            &message.to_vec(),
            SchnorrSignature::new(util::slice_to_fixed_64_bytes(signature, "signature")),
        ))
    }
}

#[wasm_bindgen]
pub struct EncryptedSearch {
    rng: Mutex<DefaultRng>,
}

#[wasm_bindgen]
impl EncryptedSearch {
    #[wasm_bindgen(constructor)]
    pub fn new() -> EncryptedSearch {
        // 10 MB
        const BYTES_BEFORE_RESEEDING: u64 = 1024 * 1024 * 10;
        EncryptedSearch {
            rng: Mutex::new(ReseedingRng::new(
                rand_chacha::ChaChaCore::from_entropy(),
                BYTES_BEFORE_RESEEDING,
                rand::rngs::OsRng::default(),
            )),
        }
    }

    /**
     * Hashes all possible tri-grams for the given string. The values will be prefixed with the partition_id and salt before being hashed.
     */
    pub fn generateHashesForString(
        &self,
        s: &str,
        salt: &[u8],
        partition_id: Option<String>,
    ) -> Result<Vec<u32>, JsError> {
        Ok(generate_hashes_for_string(s, partition_id.as_deref(), salt)
            .map(|x| x.into_iter().collect::<Vec<_>>())
            .map_err(WasmError::new)?)
    }

    /**
     * Hashes all possible tri-grams for the given string. The values will be prefixed with the partition_id and salt before
     * being hashed. This function will also add some random entries to the result to not expose how many tri-grams were actually found.
     */
    pub fn generateHashesForStringWithPadding(
        &self,
        s: &str,
        salt: &[u8],
        partition_id: Option<String>,
    ) -> Result<Vec<u32>, JsError> {
        Ok(
            generate_hashes_for_string_with_padding(s, partition_id.as_deref(), salt, &self.rng)
                .map(|x| x.into_iter().collect::<Vec<_>>())
                .map_err(WasmError::new)?,
        )
    }

    /// Generate a version of the input string where each character has been latinized using the
    /// same function as our tokenization routines.
    pub fn transliterateString(s: &str) -> String {
        transliterate_string(s)
    }
}

/**
 * Hash the provided transform key into a buffer of bytes. The various transform key object fields are concatenated
 * in a specific order in order for transform keys to be signed over.
 */
#[wasm_bindgen]
pub fn transformKeyToBytes256(transform_key_obj: &JsValue) -> Result<Vec<u8>, JsError> {
    let transform_key_js: util::JsTransformKey =
        transform_key_obj.into_serde().map_err(WasmError::new)?;
    Ok(util::js_object_to_transform_key(transform_key_js)?.to_bytes())
}

/**
 * Augment the provided transform key with the provided private key. Returns an augmented TransformKey object.
 */
#[wasm_bindgen]
pub fn augmentTransformKey256(
    transform_key_obj: &JsValue,
    private_key: &[u8],
) -> Result<JsValue, JsError> {
    let transform_key_js: util::JsTransformKey =
        transform_key_obj.into_serde().map_err(WasmError::new)?;

    let augmented_transform_key = util::js_object_to_transform_key(transform_key_js)?
        .augment(&PrivateKey::new(util::slice_to_fixed_32_bytes(
            private_key,
            "privateKey",
        )))
        .map_err(WasmError::new)?;
    Ok(
        JsValue::from_serde(&util::transform_key_to_js_object(augmented_transform_key))
            .map_err(WasmError::new)?,
    )
}

/**
 * Augment the provided public key with the other provided public key. Returns a new augmented PublicKey object.
 */
#[wasm_bindgen]
pub fn augmentPublicKey256(
    current_public_key_obj: &JsValue,
    other_public_key_obj: &JsValue,
) -> Result<JsValue, JsError> {
    let current_public_key_js: util::JsPublicKey = current_public_key_obj
        .into_serde()
        .map_err(WasmError::new)?;
    let other_public_key_js: util::JsPublicKey =
        other_public_key_obj.into_serde().map_err(WasmError::new)?;

    let augmented_public_key = util::js_object_to_public_key(&current_public_key_js)?
        .augment(&util::js_object_to_public_key(&other_public_key_js)?)
        .map_err(WasmError::new)?;

    Ok(
        JsValue::from_serde(&util::public_key_to_js_object(augmented_public_key))
            .map_err(WasmError::new)?,
    )
}

/**
 * Add the two provided private keys together and return the bytes of a new PrivateKey.
 */
#[wasm_bindgen]
pub fn addPrivateKeys(private_key_a: &[u8], private_key_b: &[u8]) -> Result<Vec<u8>, JsError> {
    let pubKeyA = PrivateKey::new(util::slice_to_fixed_32_bytes(private_key_a, "privateKeyA"));
    let pubKeyB = PrivateKey::new(util::slice_to_fixed_32_bytes(private_key_b, "privateKeyB"));
    Ok(pubKeyA.augment_plus(&pubKeyB).bytes().to_vec())
}

/**
 * Subtract the first provided private key from the second provided private key. Returns the bytes of a new PrivateKey.
 */
#[wasm_bindgen]
pub fn subtractPrivateKeys(private_key_a: &[u8], private_key_b: &[u8]) -> Result<Vec<u8>, JsError> {
    let pubKeyA = PrivateKey::new(util::slice_to_fixed_32_bytes(private_key_a, "privateKeyA"));
    let pubKeyB = PrivateKey::new(util::slice_to_fixed_32_bytes(private_key_b, "privateKeyB"));
    Ok(pubKeyA.augment_minus(&pubKeyB).bytes().to_vec())
}
