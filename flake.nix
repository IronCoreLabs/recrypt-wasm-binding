{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs { inherit system overlays; };
        rusttoolchain =
          pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;
        # wasm-bindgen = pkgs.rustPlatform.buildRustPackage rec {
        #   pname = "wasm-bindgen";
        #   version = "0.2.93";

        #   nativeBuildInputs = with pkgs; [ pkg-config ];

        #   src = pkgs.fetchCrate {
        #     inherit pname version;
        #     hash = "sha256-LatHkqF6y+XtY2S/6KJWOjmkB5NcKKfmrhEWmAACLMM=";
        #   };

        #   cargoLock.lockFile = ./wasm-bindgen-Cargo.lock;
        #   cargoLock.outputHashes = {
        #     "raytracer-0.1.0" = "sha256-k6emdBDunYK4pUxrwJCbm57LzICj+q4bRAJ/XJ0zsg0=";
        #     "weedle-0.13.0" = "sha256-S/AzZmEPamYt0vT6eM8fxnZmXWXwV1DLxVlLIYemZYc=";
        #   };
        #   cargoPatches = [
        #     ./wasm-bindgen-Cargo.lock
        #   ];

        #   cargoHash = "";
        # };
      in
      {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs-18_x
            protobuf
            (yarn.override { nodejs = nodejs-18_x; })
            rusttoolchain
            pkg-config
            wasm-bindgen-cli
          ];
        };
      });
}
