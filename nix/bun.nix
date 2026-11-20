{
  pkgs,
}:
let
  version = "1.4.5";

  sources = {
    "x86_64-linux" = pkgs.fetchurl {
      url = "https://github.com/oven-sh/bun/releases/download/bun-v${version}/bun-linux-x64.zip";
      hash = "sha256-lFWbO1KJlaSUUvnyQEzsdPLv19BuCgAKjNIUsCw2Zus=";
    };
    "aarch64-darwin" = pkgs.fetchurl {
      url = "https://github.com/oven-sh/bun/releases/download/bun-v${version}/bun-darwin-aarch64.zip";
      hash = "sha256-tda8LhPK8U5XyJZh6J79Bz/xYWW0G/5DiCYWQQYJzRA=";
    };
  };

  system = pkgs.stdenvNoCC.hostPlatform.system;
in
pkgs.bun.overrideAttrs (old: {
  inherit version;

  src = sources.${system} or (throw "Unsupported system for pinned Bun ${version}: ${system}");

  passthru = (old.passthru or { }) // {
    inherit sources;
  };
})
