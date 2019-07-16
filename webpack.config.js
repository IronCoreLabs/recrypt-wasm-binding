const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlWebpackTagsPlugin = require("html-webpack-tags-plugin");

let entry = "./lib/index.ts";
let includeAssets = [];

if (process.env.WEBPACK_MODE === "test") {
    entry = "./lib/tests/Api256Shim.test.ts";
    includeAssets = [
        {path: "https://unpkg.com/mocha@5.2.0/mocha.css", type: "css"},
        {path: "https://www.chaijs.com/chai.js", type: "js", external: {packageName: "chai", variableName: "chai"}},
        {path: "https://unpkg.com/mocha@5.2.0/mocha.js", type: "js", external: {packageName: "mocha", variableName: "mocha"}},
    ];
} else if (process.env.WEBPACK_MODE === "benchmark") {
    entry = "./benchmark/index.ts";
    includeAssets = [
        {path: "https://unpkg.com/lodash@4.17.10/lodash.min.js", type: "js", external: {packageName: "lodash", variableName: "_"}},
        {path: "https://unpkg.com/benchmark@2.1.4/benchmark.js", type: "js", external: {packageName: "benchmark", variableName: "Benchmark"}},
    ];
}

module.exports = {
    devServer: {
        overlay: true,
    },
    entry,
    output: {
        filename: "[name].js",
    },
    mode: "development",
    resolve: {
        extensions: [".ts", ".js", ".wasm"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: ["ts-loader"],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin(),
        new HtmlWebpackTagsPlugin({
            tags: includeAssets,
            append: false,
        }),
        new webpack.ProvidePlugin({
            TextDecoder: ["text-encoding", "TextDecoder"],
            TextEncoder: ["text-encoding", "TextEncoder"],
        }),
    ],
};
