{
  description = "inflectionts — Effect v4 TypeScript port of jaraco/inflect";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
  };

  outputs =
    {
      self,
      nixpkgs,
    }:
    let
      inherit (nixpkgs) lib;
      systems = [
        "x86_64-linux"
        "aarch64-darwin"
      ];
      forAllSystems = lib.genAttrs systems;

      asChecks =
        prefix: attrs: lib.mapAttrs' (name: drv: lib.nameValuePair "${prefix}-${name}" drv) attrs;

      bunHashes = import ./nix/bun-cache-hashes.nix;

      manifestSrc = lib.fileset.toSource {
        root = ./.;
        fileset = lib.fileset.unions [
          ./package.json
          ./bun.lock
          ./bunfig.toml
          ./packages/inflectionts/package.json
          ./apps/cli/package.json
        ];
      };

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
              ./LICENSE
              ./packages
              ./apps
            ])
            (
              lib.fileset.unions [
                (lib.fileset.maybeMissing ./packages/inflectionts/dist)
                (lib.fileset.maybeMissing ./apps/cli/dist)
                (lib.fileset.fileFilter (file: lib.hasSuffix ".tsbuildinfo" file.name) ./packages)
                (lib.fileset.fileFilter (file: lib.hasSuffix ".tsbuildinfo" file.name) ./apps)
              ]
            );
      };

      nixFilesSrc = lib.fileset.toSource {
        root = ./.;
        fileset = lib.fileset.unions [
          ./flake.nix
          ./nix
        ];
      };

      perSystem = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          bun = import ./nix/bun.nix { inherit pkgs; };

          bunDeps = import ./nix/bun-deps.nix {
            inherit
              pkgs
              bun
              manifestSrc
              ;
            hashes = bunHashes;
          };

          formatter = pkgs.nixfmt-tree.override {
            settings.global.excludes = [
              "repos/**"
              "node_modules/**"
              "packages/*/dist/**"
              "apps/*/dist/**"
            ];
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
              for arg in "$@"; do
                case "$arg" in
                  --lsp | --version | -V | --help | -h)
                    exec bun run --bun effect-tsgo oxlint "$@"
                    ;;
                esac
              done
              exec bun run --bun effect-tsgo oxlint --lsp "$@"
            '';
          };

          oxfmtLsp = pkgs.writeShellApplication {
            name = "oxfmt-lsp";
            runtimeInputs = [ bun ];
            text = ''
              for arg in "$@"; do
                case "$arg" in
                  --lsp | --version | -V | --help | -h)
                    exec bun run --bun oxfmt "$@"
                    ;;
                esac
              done
              exec bun run --bun oxfmt --lsp "$@"
            '';
          };

          vscodeTsdk = pkgs.writeShellApplication {
            name = "tsc";
            runtimeInputs = [ bun ];
            text = ''
              has_lsp=0
              has_stdio=0
              for arg in "$@"; do
                case "$arg" in
                  --lsp) has_lsp=1 ;;
                  --stdio) has_stdio=1 ;;
                esac
              done
              if [[ "$has_lsp" -eq 1 && "$has_stdio" -eq 0 ]]; then
                exec bun run --bun effect-tsgo tsc@7.0.2 "$@" --stdio
              fi
              exec bun run --bun effect-tsgo tsc@7.0.2 "$@"
            '';
          };

          mkSandboxedCheck =
            name: script:
            pkgs.runCommand "inflectionts-${name}"
              {
                nativeBuildInputs = [
                  bun
                  bunDeps.prepareOfflineWorkspace
                  pkgs.jq
                  pkgs.writableTmpDirAsHomeHook
                ];
              }
              ''
                cp -r "${projectSrc}" work
                chmod -R u+w work
                cd work
                prepare-offline-bun-workspace
                ${script}
                touch "$out"
              '';

          inflectiontsPkg = pkgs.stdenvNoCC.mkDerivation {
            pname = "inflectionts";
            version = "0.1.0";
            src = projectSrc;
            dontConfigure = true;
            dontFixup = true;
            nativeBuildInputs = [
              bun
              bunDeps.prepareOfflineWorkspace
              pkgs.jq
              pkgs.writableTmpDirAsHomeHook
            ];
            buildPhase = ''
              runHook preBuild
              prepare-offline-bun-workspace
              tarball="$(cd packages/inflectionts && bun scripts/pack.ts "$TMPDIR/pack")"
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p "$out"
              tar -xzf "$tarball" -C "$out" --strip-components=1
              runHook postInstall
            '';
          };

          cliPkg = pkgs.stdenvNoCC.mkDerivation {
            pname = "inflect-cli";
            version = "0.1.0";
            src = projectSrc;
            dontConfigure = true;
            dontFixup = true;
            nativeBuildInputs = [
              bun
              bunDeps.prepareOfflineWorkspace
              pkgs.makeWrapper
              pkgs.writableTmpDirAsHomeHook
            ];
            buildPhase = ''
              runHook preBuild
              prepare-offline-bun-workspace
              bun build apps/cli/src/bin.ts \
                --outfile apps/cli/dist/inflect.js \
                --target=bun \
                --format=esm \
                --minify
              runHook postBuild
            '';
            installPhase = ''
              runHook preInstall
              mkdir -p "$out/libexec/inflect" "$out/bin"
              cp apps/cli/dist/inflect.js "$out/libexec/inflect/inflect.js"
              makeWrapper "${lib.getExe bun}" "$out/bin/inflect" \
                --add-flags "--no-env-file" \
                --add-flags "$out/libexec/inflect/inflect.js"
              runHook postInstall
            '';
            meta.mainProgram = "inflect";
          };

          cliSmokeCheck = pkgs.runCommand "inflectionts-cli-smoke" { } ''
            test "$("${lib.getExe cliPkg}" plural person)" = "people"
            test "$("${lib.getExe cliPkg}" --classical-ancient plural formula)" = "formulae"
            test "$("${lib.getExe cliPkg}" currency 2.675)" = "two and 68/100"
            test "$("${lib.getExe cliPkg}" template "There plural_verb('was',2) no('error',2)")" = "There were 2 errors"
            touch "$out"
          '';

          bunVersionCheck = pkgs.runCommand "inflectionts-bun-version" { nativeBuildInputs = [ bun ]; } ''
            actual="$(bun --version)"
            if [[ "$actual" != "${bun.version}" ]]; then
              echo "Expected Bun ${bun.version}, got $actual" >&2
              exit 1
            fi
            touch "$out"
          '';

          nixfmtCheck = pkgs.runCommand "inflectionts-nixfmt" { nativeBuildInputs = [ pkgs.nixfmt ]; } ''
            find "${nixFilesSrc}" -name '*.nix' -print0 | xargs -0 nixfmt --check
            touch "$out"
          '';

          packageConsumerCheck = mkSandboxedCheck "package-consumer" ''
            tarball="$(cd packages/inflectionts && bun scripts/pack.ts "$(mktemp -d)")"
            test -f "$tarball"

            consumer_dir="$(mktemp -d)"
            mkdir -p "$consumer_dir/node_modules/inflectionts"
            tar -xzf "$tarball" -C "$consumer_dir/node_modules/inflectionts" --strip-components=1

            # Verify no catalog:, workspace:, or ./src/ paths leaked into the packed manifest
            if grep -E '"(catalog|workspace):|"./src/' "$consumer_dir/node_modules/inflectionts/package.json"; then
              echo "Packed package.json contains unresolved catalog/workspace or src export" >&2
              exit 1
            fi

            # Verify peerDependencies preserves a compatible semver range for effect
            peer_range="$(jq -r '.peerDependencies.effect' "$consumer_dir/node_modules/inflectionts/package.json")"
            if [[ "$peer_range" != "^4.1.4" ]]; then
              echo "Expected peerDependencies.effect = ^4.1.4, got $peer_range" >&2
              exit 1
            fi

            if [ -d "$consumer_dir/node_modules/inflectionts/src" ]; then
              echo "Packed tarball unexpectedly includes src/" >&2
              exit 1
            fi

            # Expose only declared peer dependency (effect) outside the workspace
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
            import * as Effect from "effect/Effect"
            import * as Option from "effect/Option"
            import * as Schema from "effect/Schema"
            import {
              comparisonCode,
              compare,
              inflect,
              Inflector,
              numberToCurrency,
              numberToWords,
              pluralNoun,
              singularNoun,
              Word
            } from "inflectionts"
            import { InvalidWordError } from "inflectionts/Errors"
            import { TypeId } from "inflectionts/Inflector"
            import { StateTypeId } from "inflectionts/Schema"

            const program = Effect.gen(function* () {
              const word: Word = Schema.decodeUnknownSync(Word)("person")
              const people = yield* pluralNoun(word, 2)
              const sing = yield* singularNoun(people)
              const cmp = comparisonCode(yield* compare("index", "indices"))
              const words = yield* numberToWords(243)
              const check = yield* numberToCurrency(2.675)
              const rendered = yield* inflect("There plural_verb('was',2) no('error',2)")

              if (
                people !== "people" ||
                Option.getOrUndefined(sing) !== "person" ||
                cmp !== "s:p" ||
                words !== "two hundred and forty-three" ||
                check !== "two and 68/100" ||
                rendered !== "There were 2 errors" ||
                TypeId !== "~inflectionts/Inflector" ||
                StateTypeId !== "~inflectionts/InflectorState" ||
                typeof InvalidWordError !== "function"
              ) {
                throw new Error("Consumer smoke verification failed")
              }
            }).pipe(Effect.provide(Inflector.layer))

            await Effect.runPromise(program)
            EOF

            bun run --bun tsc -p "$consumer_dir/tsconfig.json"
            bun --no-env-file "$consumer_dir/check.ts"

            # Verify ./internal/* is blocked by exports
            if bun --no-env-file -e 'await import("inflectionts/internal/data")' 2>/dev/null; then
              echo "Expected inflectionts/internal/data import to be blocked" >&2
              exit 1
            fi
          '';

          devShell = pkgs.mkShell {
            packages = [
              bun
              pkgs.gitFull
              pkgs.nixd
              pkgs.nixfmt
              formatter
              effectTsgoLsp
              oxlintLsp
              oxfmtLsp
            ];
            shellHook = ''
              export EFFECT_OXLINT_BIN="${oxlintLsp}/bin/oxlint-lsp"
              export EFFECT_OXFMT_BIN="${oxfmtLsp}/bin/oxfmt-lsp"
              export EFFECT_TSGO_TSDK_DIR="${vscodeTsdk}/bin"
              if [ -x .githooks/pre-commit ] && [ "$(git config --local core.hooksPath 2>/dev/null)" != ".githooks" ]; then
                git config --local core.hooksPath .githooks
              fi
            '';
          };

          packages = {
            default = cliPkg;
            cli = cliPkg;
            inflectionts = inflectiontsPkg;
            lock = bunDeps.lockPkg;
          };

          devShells = {
            default = devShell;
          };
        in
        {
          inherit formatter packages devShells;

          apps = {
            default = {
              type = "app";
              program = "${lib.getExe cliPkg}";
              meta.description = "Run the inflectionts English inflection CLI";
            };
            lock = {
              type = "app";
              program = "${bunDeps.lockPkg}/bin/lock";
              meta.description = "Regenerate nix/bun-cache-hashes.nix from bun.lock";
            };
          };

          checks =
            asChecks "package" packages
            // asChecks "dev-shell" devShells
            // {
              bun-version = bunVersionCheck;
              cli-smoke = cliSmokeCheck;
              nixfmt = nixfmtCheck;
              format = mkSandboxedCheck "format" "bun run format:check";
              typecheck = mkSandboxedCheck "typecheck" "bun run typecheck";
              lint = mkSandboxedCheck "lint" "bun run lint";
              test = mkSandboxedCheck "test" "bun run test";
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
