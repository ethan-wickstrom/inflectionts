{
  description = "inflectionts — Effect v4 TypeScript port of jaraco/inflect";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    bun2nix = {
      url = "github:nix-community/bun2nix/2.1.2";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      bun2nix,
    }:
    let
      inherit (nixpkgs) lib;
      systems = [
        "x86_64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = lib.genAttrs systems;

      projectSrc = lib.fileset.toSource {
        root = ./.;
        fileset =
          lib.fileset.difference
            (lib.fileset.unions [
              ./package.json
              ./bun.lock
              ./bunfig.toml
              ./tsconfig.base.json
              ./tsconfig.build.json
              ./tsconfig.json
              ./.oxlintrc.json
              ./.oxfmtrc.json
              ./README.md
              ./packages
            ])
            (
              lib.fileset.unions [
                (lib.fileset.maybeMissing ./packages/inflectionts/dist)
                (lib.fileset.fileFilter (file: lib.hasSuffix ".tsbuildinfo" file.name) ./packages)
              ]
            );
      };

      nixFilesSrc = lib.fileset.toSource {
        root = ./.;
        fileset = lib.fileset.unions [
          ./flake.nix
          ./nix
          (lib.fileset.maybeMissing ./bun.nix)
        ];
      };

      perSystem = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          bun = import ./nix/bun.nix { inherit pkgs; };
          bun2nixPkg = bun2nix.packages.${system}.bun2nix;
          cacheEntryCreator = bun2nix.packages.${system}.cacheEntryCreator;
          resolveCatalogTs = "${bun2nix}/nix/mk-derivation/resolve-catalog.ts";

          formatter = pkgs.nixfmt-tree.override {
            settings.global.excludes = [
              "repos/**"
              "node_modules/**"
              "packages/*/dist/**"
            ];
          };

          lockScript = pkgs.writeShellApplication {
            name = "lock";
            runtimeInputs = [
              bun2nixPkg
              pkgs.nixfmt
              pkgs.gnused
            ];
            text = ''
              tmp_lock="$(mktemp)"
              trap 'rm -f "$tmp_lock"' EXIT
              sed 's/"lockfileVersion": [23],/"lockfileVersion": 1,/' bun.lock > "$tmp_lock"
              bun2nix -l "$tmp_lock" -o bun.nix
              nixfmt bun.nix
            '';
          };

          effectTsgoLsp = pkgs.writeShellApplication {
            name = "effect-tsgo-lsp";
            runtimeInputs = [ bun ];
            text = ''
              exec bun run --bun effect-tsgo tsc@7.0.2 --lsp --stdio "$@"
            '';
          };

          oxlintLsp = pkgs.writeShellApplication {
            name = "oxlint-lsp";
            runtimeInputs = [ bun ];
            text = ''
              exec bun run --bun effect-tsgo --tsrs-lint=7.1.0-beta.tsrs3 oxlint --lsp "$@"
            '';
          };

          bunDeps =
            if builtins.pathExists ./bun.nix then
              import ./nix/bun-deps.nix {
                inherit
                  pkgs
                  bun
                  cacheEntryCreator
                  resolveCatalogTs
                  ;
                bunNix = ./bun.nix;
              }
            else
              null;

          mkOfflineCheck =
            name: script:
            pkgs.stdenvNoCC.mkDerivation {
              name = "inflectionts-${name}";
              src = projectSrc;
              dontConfigure = true;
              dontFixup = true;
              nativeBuildInputs = [
                bun
                bunDeps.prepareOfflineWorkspace
              ];
              buildPhase = ''
                runHook preBuild
                prepare-offline-bun-workspace
                ${script}
                runHook postBuild
              '';
              installPhase = ''
                mkdir -p "$out"
                printf 'ok\n' > "$out/status"
              '';
            };

          inflectiontsPkg = pkgs.stdenvNoCC.mkDerivation {
            pname = "inflectionts";
            version = "0.1.0";
            src = projectSrc;
            dontConfigure = true;
            dontFixup = true;
            nativeBuildInputs = [
              bun
              bunDeps.prepareOfflineWorkspace
            ];
            buildPhase = ''
              runHook preBuild
              prepare-offline-bun-workspace
              bun run build
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p "$out"
              cp -r packages/inflectionts/dist "$out/dist"
              cp packages/inflectionts/package.json "$out/package.json"
              cp README.md "$out/README.md"
              runHook postInstall
            '';
          };

          packageConsumerCheck = pkgs.stdenvNoCC.mkDerivation {
            name = "inflectionts-package-consumer";
            src = projectSrc;
            dontConfigure = true;
            dontFixup = true;
            nativeBuildInputs = [
              bun
              bunDeps.prepareOfflineWorkspace
            ];
            buildPhase = ''
              runHook preBuild
              prepare-offline-bun-workspace
              bun run build

              pack_dir="$(mktemp -d)"
              (cd packages/inflectionts && bun pm pack --destination "$pack_dir")
              tarball="$(find "$pack_dir" -maxdepth 1 -name '*.tgz' | head -n 1)"
              test -n "$tarball"

              consumer_dir="$(mktemp -d)"
              mkdir -p "$consumer_dir/node_modules/inflectionts"
              tar -xzf "$tarball" -C "$consumer_dir/node_modules/inflectionts" --strip-components=1

              # Verify no catalog: or workspace: specifiers leaked into the packed manifest
              if grep -E '"(catalog|workspace):' "$consumer_dir/node_modules/inflectionts/package.json"; then
                echo "Packed package.json contains unresolved catalog/workspace specifier" >&2
                exit 1
              fi

              # Expose only declared peer dependency (effect) and tsc outside the workspace
              ln -s "$(readlink -f node_modules/.bun/effect@4.1.4/node_modules/effect)" "$consumer_dir/node_modules/effect"

              cat > "$consumer_dir/package.json" <<'EOF'
              {
                "name": "consumer-smoke",
                "private": true,
                "type": "module"
              }
              EOF

              cat > "$consumer_dir/tsconfig.json" <<'EOF'
              {
                "compilerOptions": {
                  "target": "ES2022",
                  "lib": ["ES2023"],
                  "module": "NodeNext",
                  "moduleResolution": "NodeNext",
                  "strict": true,
                  "noEmit": true,
                  "skipLibCheck": true,
                  "types": []
                },
                "include": ["check.ts"]
              }
              EOF

              cat > "$consumer_dir/check.ts" <<'EOF'
              import { Schema } from "effect"
              import { Word } from "inflectionts"

              const decode = Schema.decodeUnknownSync(Word)
              const w: Word = decode("cat")
              if (w !== "cat") {
                throw new Error("unexpected decode result")
              }
              EOF

              bun run --bun tsc -p "$consumer_dir/tsconfig.json"
              bun --no-env-file "$consumer_dir/check.ts"
              runHook postBuild
            '';
            installPhase = ''
              mkdir -p "$out"
              printf 'ok\n' > "$out/status"
            '';
          };

          nixfmtCheck = pkgs.runCommand "inflectionts-nixfmt" { nativeBuildInputs = [ pkgs.nixfmt ]; } ''
            find "${nixFilesSrc}" -name '*.nix' -print0 | xargs -0 nixfmt --check
            mkdir -p "$out"
            printf 'ok\n' > "$out/status"
          '';

          devShell = pkgs.mkShell {
            packages = [
              bun
              pkgs.gitFull
              formatter
              effectTsgoLsp
              oxlintLsp
            ];
          };
        in
        {
          inherit formatter;

          apps.lock = {
            type = "app";
            program = "${lockScript}/bin/lock";
            meta.description = "Regenerate bun.nix from bun.lock";
          };

          devShells.default = devShell;

          packages = lib.optionalAttrs (bunDeps != null) {
            default = inflectiontsPkg;
            inflectionts = inflectiontsPkg;
          };

          checks = {
            dev-shell-default = devShell;
            app-lock = lockScript;
            nixfmt = nixfmtCheck;
          }
          // lib.optionalAttrs (bunDeps != null) {
            package-default = inflectiontsPkg;
            format = mkOfflineCheck "format" "bun run format:check";
            typecheck = mkOfflineCheck "typecheck" "bun run typecheck";
            lint = mkOfflineCheck "lint" "bun run lint";
            test = mkOfflineCheck "test" "bun run test";
            package-consumer = packageConsumerCheck;
          };
        }
      );
    in
    {
      formatter = forAllSystems (system: perSystem.${system}.formatter);
      apps = forAllSystems (system: perSystem.${system}.apps);
      devShells = forAllSystems (system: perSystem.${system}.devShells);
      packages = forAllSystems (system: perSystem.${system}.packages);
      checks = forAllSystems (system: perSystem.${system}.checks);
    };
}
