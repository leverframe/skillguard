#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

KEY_DIR="./keys"
PLUGIN_DIR="./test-plugin"
SECRET_KEY="$KEY_DIR/test-secret.key"
PUBLIC_KEY="$PLUGIN_DIR/KEYS.txt"

mkdir -p "$KEY_DIR"

if [ ! -f "$SECRET_KEY" ]; then
  echo "Generating minisign keypair..."
  # -W writes the password hash without interaction; empty password is fine for test fixtures.
  minisign -G -s "$SECRET_KEY" -p "$PUBLIC_KEY" -W
fi

TARBALL="$PLUGIN_DIR.tar.gz"
tar -czf "$TARBALL" -C "$(dirname "$PLUGIN_DIR")" "$(basename "$PLUGIN_DIR")"

minisign -S -s "$SECRET_KEY" -m "$TARBALL" -W

echo "Fixture ready: $TARBALL + $TARBALL.minisig + $PUBLIC_KEY"
