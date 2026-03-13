#!/bin/bash

# Exit on error
set -e

ICON_PNG="resources/icon.png"
ICON_SET="resources/icon.iconset"
ICON_ICNS="resources/icon.icns"

# No need to create build directory for this anymore

# Create iconset directory
mkdir -p "$ICON_SET"

echo "Generating icons for macOS..."

# Create various sizes for the iconset
sips -z 16 16     "$ICON_PNG" --out "$ICON_SET/icon_16x16.png"
sips -z 32 32     "$ICON_PNG" --out "$ICON_SET/icon_16x16@2x.png"
sips -z 32 32     "$ICON_PNG" --out "$ICON_SET/icon_32x32.png"
sips -z 64 64     "$ICON_PNG" --out "$ICON_SET/icon_32x32@2x.png"
sips -z 128 128   "$ICON_PNG" --out "$ICON_SET/icon_128x128.png"
sips -z 256 256   "$ICON_PNG" --out "$ICON_SET/icon_128x128@2x.png"
sips -z 256 256   "$ICON_PNG" --out "$ICON_SET/icon_256x256.png"
sips -z 512 512   "$ICON_PNG" --out "$ICON_SET/icon_256x256@2x.png"
sips -z 512 512   "$ICON_PNG" --out "$ICON_SET/icon_512x512.png"
sips -z 1024 1024 "$ICON_PNG" --out "$ICON_SET/icon_512x512@2x.png"

# Convert iconset to icns
iconutil -c icns "$ICON_SET" -o "$ICON_ICNS"

# Cleanup iconset
rm -rf "$ICON_SET"

echo "Successfully generated $ICON_ICNS"
