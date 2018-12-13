Release Checklist
=================

* Decide on the new version number and update it within the `Cargo.toml` file. This will be used as the NPM version number.
* Write the CHANGELOG.md entry for the release by looking at the PRs.
* Commit `Cargo.toml` (for version number) and `CHANGELOG.md`.
* Run the build script, `./build.js` and make sure no errors are generated. This does a dry run of the release process without actually releasing anything.
* Run `./build.js --publish` which will generate the necessary files for NPM, add a git tag, push the git tag, and deploy the code to NPM.