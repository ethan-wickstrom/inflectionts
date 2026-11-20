{
  pkgs,
  bun,
  cacheEntryCreator,
  resolveCatalogTs,
  bunNix,
}:
let
  inherit (pkgs) lib;

  rawPackages = pkgs.callPackage bunNix {
    inherit (pkgs) fetchurl;
  };

  platformTokens = [
    "darwin"
    "linux"
    "win32"
    "android"
    "freebsd"
    "openbsd"
    "netbsd"
    "sunos"
    "aix"
    "openharmony"
  ];

  isPlatformSpecific = name: lib.any (token: lib.hasInfix token name) platformTokens;

  matchesHostPlatform =
    name:
    if pkgs.stdenv.hostPlatform.system == "x86_64-linux" then
      lib.hasInfix "linux-x64" name && !(lib.hasInfix "musl" name) && !(lib.hasInfix "android" name)
    else if pkgs.stdenv.hostPlatform.system == "aarch64-darwin" then
      lib.hasInfix "darwin-arm64" name
    else
      true;

  packages = lib.filterAttrs (
    name: value: lib.isStorePath value && (!(isPlatformSpecific name) || matchesHostPlatform name)
  ) rawPackages;

  needsAutoPatchelf =
    name: pkgs.stdenv.hostPlatform.isLinux && isPlatformSpecific name && matchesHostPlatform name;

  extractPackage = pkgs.writeShellApplication {
    name = "extract-bun-package";
    runtimeInputs = [ pkgs.libarchive ];
    text = ''
      pkg="$1"
      out="$2"
      mkdir -p "$out"
      if [[ "$pkg" == *.tgz ]]; then
        bsdtar --extract \
          --file "$pkg" \
          --directory "$out" \
          --strip-components=1 \
          --no-same-owner \
          --no-same-permissions
      else
        cp -r "$pkg/." "$out"
      fi
      chmod -R u+rwx "$out"
    '';
  };

  bunWithFakeNode = pkgs.stdenvNoCC.mkDerivation {
    name = "bun-with-fake-node-${bun.version}";
    dontUnpack = true;
    dontConfigure = true;
    dontBuild = true;
    installPhase = ''
      mkdir -p "$out/bin"
      ln -s "${lib.getExe bun}" "$out/bin/bun"
      ln -s "${lib.getExe bun}" "$out/bin/node"
    '';
  };

  buildCacheEntry =
    name: pkg:
    let
      patchElf = needsAutoPatchelf name;
    in
    pkgs.stdenvNoCC.mkDerivation {
      name = "bun-pkg-${lib.strings.sanitizeDerivationName name}";
      dontUnpack = true;
      dontConfigure = true;
      dontBuild = true;
      nativeBuildInputs = [
        bunWithFakeNode
      ]
      ++ lib.optionals patchElf [
        pkgs.autoPatchelfHook
        pkgs.stdenv.cc.cc.lib
      ];
      installPhase = ''
        "${lib.getExe extractPackage}" "${pkg}" "$out/share/bun-packages/${name}"
        patchShebangs "$out/share/bun-packages/${name}"
        ${lib.optionalString patchElf ''
          autoPatchelf "$out/share/bun-packages/${name}"
        ''}
        "${lib.getExe cacheEntryCreator}" \
          --out "$out/share/bun-cache" \
          --name "${name}" \
          --package "$out/share/bun-packages/${name}"
      '';
      preferLocalBuild = true;
      allowSubstitutes = false;
    };

  bunCache = pkgs.symlinkJoin {
    name = "inflectionts-bun-cache";
    paths = builtins.attrValues (builtins.mapAttrs buildCacheEntry packages);
  };

  bunInstallFlags =
    if pkgs.stdenv.hostPlatform.isDarwin then
      "--frozen-lockfile --ignore-scripts --linker=isolated --backend=symlink"
    else
      "--frozen-lockfile --ignore-scripts --linker=isolated";

  prepareOfflineWorkspace = pkgs.writeShellApplication {
    name = "prepare-offline-bun-workspace";
    runtimeInputs = [
      bun
      pkgs.coreutils
    ];
    text = ''
      HOME="$(mktemp -d)"
      export HOME
      BUN_INSTALL_CACHE_DIR="$(mktemp -d)"
      export BUN_INSTALL_CACHE_DIR

      cp -rL "${bunCache}/share/bun-cache/." "$BUN_INSTALL_CACHE_DIR"
      chmod -R u+w "$BUN_INSTALL_CACHE_DIR"

      if [[ -f bun.lock ]] && grep -q '"catalog:' bun.lock; then
        bun --config=/dev/null --no-install "${resolveCatalogTs}" .
      fi

      bun install ${bunInstallFlags}
    '';
  };
in
{
  inherit bunCache prepareOfflineWorkspace;
}
