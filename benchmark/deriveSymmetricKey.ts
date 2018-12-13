declare const Benchmark: any;

export default (Recrypt: typeof import("../lib/Api256Shim"), logResult: (results: string) => void) => {
    const api = new Recrypt.Api256();

    let plaintext: Uint8Array;

    function onCycle() {
        plaintext = api.generatePlaintext();
    }
    onCycle();

    return new Benchmark("deriveSymmetricKey", {
        fn: () => {
            api.deriveSymmetricKey(plaintext);
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
