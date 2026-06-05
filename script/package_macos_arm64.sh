#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="SimplePOS"
BUNDLE_ID="com.simplepos.app"
RELEASE_DIR="$ROOT_DIR/release/mac-arm64"
SOURCE_APP="$ROOT_DIR/node_modules/electron/dist/Electron.app"
TARGET_APP="$RELEASE_DIR/$APP_NAME.app"
APP_PAYLOAD="$TARGET_APP/Contents/Resources/app"
ELECTRON_NODE="$ROOT_DIR/node_modules/.bin/electron"

if [[ ! -d "$SOURCE_APP" ]]; then
  echo "Electron.app was not found at $SOURCE_APP"
  exit 1
fi

mkdir -p "$RELEASE_DIR"

echo "Building renderer"
ELECTRON_RUN_AS_NODE=1 "$ELECTRON_NODE" "$ROOT_DIR/node_modules/vite/bin/vite.js" build

echo "Building Electron main process"
ELECTRON_RUN_AS_NODE=1 "$ELECTRON_NODE" "$ROOT_DIR/node_modules/typescript/bin/tsc" -p "$ROOT_DIR/tsconfig.electron.json"

echo "Creating $TARGET_APP"
rm -rf "$TARGET_APP"
ditto "$SOURCE_APP" "$TARGET_APP"

rm -rf "$APP_PAYLOAD"
mkdir -p "$APP_PAYLOAD"

ditto "$ROOT_DIR/dist" "$APP_PAYLOAD/dist"
ditto "$ROOT_DIR/dist-electron" "$APP_PAYLOAD/dist-electron"
ditto "$ROOT_DIR/node_modules" "$APP_PAYLOAD/node_modules"
cp "$ROOT_DIR/package.json" "$APP_PAYLOAD/package.json"

/usr/libexec/PlistBuddy -c "Set :CFBundleName $APP_NAME" "$TARGET_APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName $APP_NAME" "$TARGET_APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier $BUNDLE_ID" "$TARGET_APP/Contents/Info.plist"

echo "Packaged $TARGET_APP"
