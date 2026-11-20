{
  pkgs,
  bun,
  manifestSrc,
  hashes,
}:
let
  inherit (pkgs) lib;
  system = pkgs.stdenvNoCC.hostPlatform.system;
  bunVersion = bun.version;

  cacheHash =
    hashes.${system} or (throw "Missing Bun cache hash for ${system}; run `nix run .#lock`");

  # Stage 1: Fixed-output derivation populating a normalized, store-reference-free
  # Bun cache from bun.lock + workspace manifests.
  bunCacheRaw = pkgs.stdenvNoCC.mkDerivation {
    name = "inflectionts-bun-cache-raw-${bunVersion}-${system}";
    src = manifestSrc;
    dontConfigure = true;
    dontBuild = true;
    dontFixup = true;
    nativeBuildInputs = [
      bun
      pkgs.cacert
      pkgs.coreutils
      pkgs.findutils
    ];
    outputHashMode = "recursive";
    outputHashAlgo = "sha256";
    outputHash = cacheHash;
    installPhase = ''
      export HOME="$TMPDIR/home"
      export SSL_CERT_FILE="${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
      mkdir -p "$HOME" "$out"

      BUN_INSTALL_CACHE_DIR="$out" \
        bun install --frozen-lockfile --ignore-scripts --linker=isolated --backend=copyfile --no-progress

      # Normalize Bun's absolute cache symlinks to relative symlinks so the FOD
      # output has zero temp-path or /nix/store references and hashes identically.
      while IFS= read -r -d "" link; do
        target="$(readlink -f "$link")"
        rel="$(realpath --relative-to="$(dirname "$link")" "$target")"
        ln -sfn "$rel" "$link"
      done < <(find "$out" -type l -print0)

      find "$out" -maxdepth 1 -name '*.npm' -delete
      rm -rf "$out/.tmp"
    '';
  };

  bunWithFakeNode = pkgs.stdenvNoCC.mkDerivation {
    name = "bun-with-fake-node-${bunVersion}";
    dontUnpack = true;
    dontConfigure = true;
    dontBuild = true;
    installPhase = ''
      mkdir -p "$out/bin"
      ln -s "${lib.getExe bun}" "$out/bin/bun"
      ln -s "${lib.getExe bun}" "$out/bin/node"
    '';
  };

  # Stage 2: Offline derivation adapting the raw FOD cache for sandbox execution:
  # rewrites `#!/usr/bin/env node` shebangs to the pinned Bun and patches Linux ELFs.
  bunCache = pkgs.stdenvNoCC.mkDerivation {
    name = "inflectionts-bun-cache-${bunVersion}-${system}";
    dontUnpack = true;
    dontConfigure = true;
    dontBuild = true;
    nativeBuildInputs = [
      bunWithFakeNode
    ]
    ++ lib.optionals pkgs.stdenv.hostPlatform.isLinux [
      pkgs.autoPatchelfHook
      pkgs.stdenv.cc.cc.lib
    ];
    installPhase = ''
      mkdir -p "$out"
      cp -a "${bunCacheRaw}/." "$out/"
      chmod -R u+w "$out"
      patchShebangs "$out"
    '';
  };

  bunInstallFlags =
    if pkgs.stdenv.hostPlatform.isDarwin then
      "--offline --frozen-lockfile --ignore-scripts --linker=isolated --backend=symlink"
    else
      "--offline --frozen-lockfile --ignore-scripts --linker=isolated";

  prepareOfflineWorkspace = pkgs.writeShellApplication {
    name = "prepare-offline-bun-workspace";
    inheritPath = false;
    runtimeInputs = [
      bun
      pkgs.coreutils
    ];
    text = ''
      actual_version="$(bun --version)"
      if [[ "$actual_version" != "${bunVersion}" ]]; then
        echo "Expected Bun ${bunVersion}, got $actual_version" >&2
        exit 1
      fi

      cache_dir="$(mktemp -d)"
      cp -a "${bunCache}/." "$cache_dir/"
      chmod -R u+w "$cache_dir"

      BUN_INSTALL_CACHE_DIR="$cache_dir" bun install ${bunInstallFlags}
    '';
  };

  lockPkg = pkgs.writeShellApplication {
    name = "lock";
    inheritPath = false;
    runtimeInputs = [
      bun
      pkgs.cacert
      pkgs.coreutils
      pkgs.findutils
      pkgs.jq
      pkgs.nix
      pkgs.nixfmt
    ];
    text = ''
      if [[ ! -f bun.lock || ! -f package.json ]]; then
        echo "Run \`nix run .#lock\` from the repository root." >&2
        exit 1
      fi

      tmp_dir="$(mktemp -d)"
      trap 'rm -rf "$tmp_dir"' EXIT

      work_dir="$tmp_dir/work"
      cache_dir="$tmp_dir/cache"
      home_dir="$tmp_dir/home"
      mkdir -p "$work_dir" "$cache_dir" "$home_dir"

      cp package.json bun.lock bunfig.toml "$work_dir/"
      while IFS= read -r -d "" pkg_json; do
        rel="''${pkg_json#./}"
        mkdir -p "$work_dir/$(dirname "$rel")"
        cp "$pkg_json" "$work_dir/$rel"
      done < <(find ./packages ./apps -maxdepth 2 -name package.json -print0 2>/dev/null || true)

      (
        cd "$work_dir"
        export HOME="$home_dir"
        export SSL_CERT_FILE="${pkgs.cacert}/etc/ssl/certs/ca-bundle.crt"
        BUN_INSTALL_CACHE_DIR="$cache_dir" \
          bun install --frozen-lockfile --ignore-scripts --linker=isolated --backend=copyfile --no-progress
      )

      while IFS= read -r -d "" link; do
        target="$(readlink -f "$link")"
        rel="$(realpath --relative-to="$(dirname "$link")" "$target")"
        ln -sfn "$rel" "$link"
      done < <(find "$cache_dir" -type l -print0)

      find "$cache_dir" -maxdepth 1 -name '*.npm' -delete
      rm -rf "$cache_dir/.tmp"

      new_hash="$(nix hash path "$cache_dir")"
      current_system="${system}"

      existing_json="{}"
      if [[ -f nix/bun-cache-hashes.nix ]]; then
        existing_json="$(nix eval --json --file nix/bun-cache-hashes.nix)"
      fi

      updated_json="$(
        printf '%s\n' "$existing_json" \
          | jq --arg sys "$current_system" --arg hash "$new_hash" '.[$sys] = $hash'
      )"

      {
        echo "# Autogenerated by \`nix run .#lock\`. Do not edit manually."
        echo "{"
        printf '%s\n' "$updated_json" \
          | jq -r 'to_entries | sort_by(.key)[] | "  \"\(.key)\" = \"\(.value)\";"'
        echo "}"
      } > nix/bun-cache-hashes.nix

      nixfmt nix/bun-cache-hashes.nix
      echo "Updated nix/bun-cache-hashes.nix for $current_system -> $new_hash"
    '';
  };
in
{
  inherit
    bunCache
    bunCacheRaw
    lockPkg
    prepareOfflineWorkspace
    ;
}
