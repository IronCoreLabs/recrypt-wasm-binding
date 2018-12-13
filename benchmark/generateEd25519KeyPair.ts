declare const Benchmark: any;

export default (Recrypt: typeof import("../lib/Api256Shim"), logResult: (results: string) => void) => {
    const api = new Recrypt.Api256();
    return new Benchmark("generateEd25519KeyPair", {
        fn: () => {
            api.generateEd25519KeyPair();
        },
        onError: (err: Error) => {
            console.log(err);
        },
        onComplete: (result: any) => {
            const resultString = result.currentTarget.toString();
            logResult(resultString);
            console.log(result.currentTarget.toString());
        },
    });
};
