import {EncryptedValue} from "../recrypt_wasm_binding";
declare const Benchmark: any;

export default (Recrypt: typeof import("../lib/Api256Shim"), logResult: (results: string) => void) => {
    const api = new Recrypt.Api256();
    //prettier-ignore
    const privateSigningKey = new Uint8Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 138, 136, 227, 221, 116, 9, 241, 149, 253, 82, 219, 45, 60, 186, 93, 114, 202, 103, 9, 191, 29, 148, 18, 27, 243, 116, 136, 1, 180, 15, 111, 92]);

    let devicePrivateKey: Uint8Array, lvl1EncryptedValue: EncryptedValue;

    function onCycle() {
        const plaintext = api.generatePlaintext();
        const userKeys = api.generateKeyPair();
        const deviceKeys = api.generateKeyPair();
        devicePrivateKey = deviceKeys.privateKey;
        const transformKey = api.generateTransformKey(userKeys.privateKey, deviceKeys.publicKey, privateSigningKey);

        const lvl0EncryptedValue = api.encrypt(plaintext, userKeys.publicKey, privateSigningKey);
        lvl1EncryptedValue = api.transform(lvl0EncryptedValue, transformKey, privateSigningKey);
    }
    onCycle();

    return new Benchmark("decryptLevel1", {
        fn: () => {
            api.decrypt(lvl1EncryptedValue, devicePrivateKey);
        },
        onError: (err: Error) => {
            console.log(err);
        },
        onCycle,
        onComplete: (result: any) => {
            const resultString = result.currentTarget.toString();
            logResult(resultString);
            console.log(result.currentTarget.toString());
        },
    });
};
