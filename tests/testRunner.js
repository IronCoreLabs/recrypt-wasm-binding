/**
 * Testing WASM modules is still in it's infancy. Most test runner utilities don't yet support loading WASM modules because most of them
 * run in a Node context. Adding in our mix of TypeScript for our WASM shim wrappers adds more complexity to this. In order for the unit tests
 * to work we have a couple requirements/needs:
 *
 *   + Tests have to run in an actual browser which supports WebAssembly
 *   + We'll use webpack to build our bundle which allows us to add TypeScript compilation as well as move the WASM module to its own chunk
 *   + We will want the results of the unit test to be reported via the command line
 *
 * In order to achieve this we perform the following when this script runs:
 *
 *  + Startup a webpack server which serves up a page which contains our bundled source as well as a test runner/asserter (Mocha & Chai, respectively). When the
 *    webpack server starts up it automatically runs the unit tests and prints the results within the browser.
 *  + After the webpack server has started up we then use Puppeteer to programmatically control our Chrome Headless instance to record and document the results
 *    of the unit tests to the command line. We startup Chrome Headless and point it at the webpack server on localhost.
 *  + After the unit tests run via Mocha/Chai in the browser, they dump out a div to the page with a unique ID. We then use Puppeteer to detect when this div is
 *    visible to know that the unit tests are complete and we can pull the success/failure values from the page and dump them to the page.
 *  + After recording the results, this script will exit with the appropriate status code to denote success or failure.
 */

process.env.WEBPACK_MODE = "test";

const puppeteer = require("puppeteer");
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const config = require("../webpack.config");
const server = new WebpackDevServer({host: "localhost", port: 8080}, webpack(config));

/**
 * Startup Puppeteer to hit the webpack-dev-server endpoint which will run our unit tests.
 */
function runTest() {
    console.log("\nRunning Puppeteer to verify unit tests in browser...\n");
    puppeteer.launch({args: ["--no-sandbox"]}).then(async (browser) => {
        const page = await browser.newPage();
        await page.goto("http://localhost:8080");

        page.waitForSelector("#mocha_complete").then(async () => {
            const success = await page.evaluate((el) => el.innerHTML, await page.$(".passes em"));
            const failures = await page.evaluate((el) => el.innerHTML, await page.$(".failures em"));
            console.log(`\nTests Passed: ${success}\n`);
            console.error(`\nTests Failed: ${failures}\n`);
            server.stopCallback(() => {
                console.log("\nServer closed.");
            });
            if (parseInt(failures) > 0) {
                const failureErrorMessages = await page.evaluate(() => {
                    const errorMessages = document.querySelectorAll("pre.error");
                    return [].map.call(errorMessages, (message) => message.innerHTML);
                });

                console.error(failureErrorMessages);
                console.error("Run 'yarn run testInBrowser' to see results at http://localhost:8080.\n\n");
                browser.close();
                process.exit(-1);
            } else {
                browser.close();
            }
        });
    });
}

console.log("Starting up webserver to host wasm source...\n");
server.startCallback((err) => {
    if (err) {
        server.stopCallback(() => {
            console.error(err);
            process.exit(-1);
        });
    }
    runTest();
});
