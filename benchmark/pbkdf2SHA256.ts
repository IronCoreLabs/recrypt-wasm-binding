declare const Benchmark: any;

export default (Recrypt: typeof import("../lib/Api256Shim"), logResult: (results: string) => void) => {
    //prettier-ignore
    const salt = new Uint8Array([138, 136, 227, 221, 116, 9, 241, 149, 253, 82, 219, 45, 60, 186, 93, 114, 202, 103, 9, 191, 29, 148, 18, 27, 243, 116, 136, 1, 180, 15, 111, 92]);
    const iterations = 250000;
    const password = new Uint8Array([112, 97, 115, 115, 119, 111, 114, 100]);

    return new Benchmark("pbkdf2SHA256", {
        fn: () => {
            Recrypt.pbkdf2SHA256(salt, password, iterations);
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
