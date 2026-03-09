{
  description = "brain-cloud — Cloudflare Workers + D1 monorepo";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Runtime
            nodejs_22
            pnpm

            # Tools
            just
            jq
            curl
          ];

          shellHook = ''
            echo "brain-cloud dev environment"
            echo ""
            just --list --list-heading "" 2>/dev/null || true
            echo ""
            echo "Run 'just install' to get started."
          '';
        };
      });
}
