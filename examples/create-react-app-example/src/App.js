import {useEffect, useState} from "react";
import "./App.css";

// helpers
const toBase64 = (u8) => btoa(String.fromCharCode.apply(null, u8));
const arrayEq = (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
};

// example CRA usage
function App() {
    const [recryptApi, setApi] = useState(null);

    useEffect(() => {
        const importRecrypt = async () => {
            const Recrypt = await import("@ironcorelabs/recrypt-wasm-binding");
            setApi(new Recrypt.Api256());
        };
        importRecrypt();
    }, []);

    const getElement = () => {
        if (recryptApi !== null) {
            //Generate both a user key pair and a signing key pair
            const keys = recryptApi.generateKeyPair();
            const signingKeys = recryptApi.generateEd25519KeyPair();

            //Generate a plaintext to encrypt
            const plaintext = recryptApi.generatePlaintext();

            //Encrypt the data to the public key and then attempt to decrypt with the private key
            const ciphertext = recryptApi.encrypt(plaintext, keys.publicKey, signingKeys.privateKey);
            const decrypted = recryptApi.decrypt(ciphertext, keys.privateKey);
            const roundtripped = arrayEq(plaintext, decrypted);

            return (
                <div>
                    Each value is the base64 encoded representation of the given byte array.
                    <p>plaintext: {toBase64(plaintext)}</p>
                    <p>ciphertext: {toBase64(ciphertext.encryptedMessage)}</p>
                    <p>decrypted: {toBase64(decrypted)}</p>
                    <p style={{color: roundtripped ? "green" : "red"}}>{roundtripped ? "plaintext === decrypted" : "plaintext !== decrypted"}</p>
                </div>
            );
        } else {
            return <div>Loading...</div>;
        }
    };

    return (
        <div className="App">
            <header className="App-header">{getElement()}</header>
        </div>
    );
}

export default App;
