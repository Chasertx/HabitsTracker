#!/usr/bin/env bash
# Builds the release APK inside the reactnativecommunity/react-native-android container.
# Run through scripts/release-android.ps1 -Docker (or see that script for the docker command).
#
# Expects:  /src  the mobile/ folder (read-only)     /out  where HabitsTracker.apk is written
#           EXPO_PUBLIC_API_URL and EXPO_PUBLIC_API_KEY in the environment
set -euo pipefail

: "${EXPO_PUBLIC_API_URL:?EXPO_PUBLIC_API_URL is required}"
: "${EXPO_PUBLIC_API_KEY:?EXPO_PUBLIC_API_KEY is required}"
export NODE_ENV=production CI=1

# Work on a copy so the Windows checkout (and its node_modules) is never touched.
rm -rf /work && mkdir -p /work
tar -C /src --exclude=./node_modules --exclude=./android --exclude=./.expo -cf - . | tar -C /work -xf -
cd /work

echo "== Installing dependencies"
npm ci --legacy-peer-deps --no-audit --no-fund

echo "== Generating the native Android project"
npx expo prebuild --platform android --no-install

echo "== Building release APK"
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64 --no-daemon --console=plain

cp app/build/outputs/apk/release/app-release.apk /out/HabitsTracker.apk
echo "== Done: /out/HabitsTracker.apk"
