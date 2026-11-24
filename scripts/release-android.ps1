<#
.SYNOPSIS
  Builds the Android APK and publishes it as a GitHub Release.

.DESCRIPTION
  -Builder chooses where the APK is built:
    Docker (default)  Linux container (reactnativecommunity/react-native-android). Needs only
                      Docker Desktop; avoids Windows path-length and antivirus problems.
    Local             This machine's Android SDK with Gradle. Needs JDK 17+, the Android SDK and
                      CMake 3.31.6 (sdkmanager "cmake;3.31.6") on Windows.
    Eas               Expo's cloud (limited free builds per month); key from EAS env vars.

  The APK is always uploaded as HabitsTracker.apk, so this link (and the QR code in the
  README) always installs the newest release:
  https://github.com/Chasertx/HabitsTracker/releases/latest/download/HabitsTracker.apk

  Bump "version" and "android.versionCode" in mobile/app.json before each release so
  Android installs it as an update.

.EXAMPLE
  $env:EXPO_PUBLIC_API_KEY = "<ApiKey value from Render>"
  ./scripts/release-android.ps1 -Tag v1.0.1 -Notes "Fix set editing"
#>
param(
    [Parameter(Mandatory)] [string] $Tag,
    [string] $Notes = 'Android build. Install HabitsTracker.apk on your phone.',
    [ValidateSet('Docker', 'Local', 'Eas')] [string] $Builder = 'Docker',
    [string] $ApiUrl = 'https://habits-tracker-api-ilt7.onrender.com',
    [string] $ApiKey = $env:EXPO_PUBLIC_API_KEY
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$mobile = Join-Path $root 'mobile'
$outDir = Join-Path $root 'publish'
$apkPath = Join-Path $outDir 'HabitsTracker.apk'
New-Item -ItemType Directory -Force $outDir | Out-Null
if (Test-Path $apkPath) { Remove-Item $apkPath }

if ($Builder -ne 'Eas' -and -not $ApiKey) {
    throw 'Set EXPO_PUBLIC_API_KEY (or pass -ApiKey) to the ApiKey value configured on Render.'
}

switch ($Builder) {
    'Docker' {
        Write-Host 'Building APK in Docker (first run downloads the Android NDK and Gradle deps)...'
        docker run --rm `
            -v "${mobile}:/src:ro" `
            -v "$(Join-Path $root 'scripts/build-apk-in-docker.sh'):/build.sh:ro" `
            -v "${outDir}:/out" `
            -v habits-gradle-cache:/root/.gradle `
            -v habits-npm-cache:/root/.npm `
            -e "EXPO_PUBLIC_API_URL=$ApiUrl" `
            -e "EXPO_PUBLIC_API_KEY=$ApiKey" `
            reactnativecommunity/react-native-android:latest bash /build.sh
        if ($LASTEXITCODE -ne 0) { throw 'Docker build failed' }
    }

    'Local' {
        if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
        # Native build paths exceed 260 characters; Ninja 1.12+ (bundled with CMake 3.31.6)
        # handles long paths, the default CMake 3.22.1's Ninja 1.10 does not.
        $cmakeDir = Join-Path $env:ANDROID_HOME 'cmake/3.31.6'
        if (-not (Test-Path (Join-Path $cmakeDir 'bin/ninja.exe'))) {
            throw 'CMake 3.31.6 not found in the Android SDK. Install it: sdkmanager "cmake;3.31.6"'
        }

        $env:EXPO_PUBLIC_API_URL = $ApiUrl
        $env:EXPO_PUBLIC_API_KEY = $ApiKey
        $env:NODE_ENV = 'production'
        $env:CI = '1'

        Push-Location $mobile
        try {
            npx expo prebuild --platform android --no-install
            if ($LASTEXITCODE -ne 0) { throw 'expo prebuild failed' }

            Set-Content -Encoding ascii (Join-Path $mobile 'android/local.properties') @(
                "sdk.dir=$($env:ANDROID_HOME -replace '\\', '/')",
                "cmake.dir=$($cmakeDir -replace '\\', '/')"
            )

            Push-Location android
            try {
                ./gradlew assembleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64'
                if ($LASTEXITCODE -ne 0) { throw 'Gradle build failed' }
            } finally { Pop-Location }
        } finally { Pop-Location }

        Copy-Item (Join-Path $mobile 'android/app/build/outputs/apk/release/app-release.apk') $apkPath -Force
    }

    'Eas' {
        Push-Location $mobile
        try {
            $output = npx eas-cli@latest build --platform android --profile preview --non-interactive --wait --json
            if ($LASTEXITCODE -ne 0) { throw 'EAS build failed' }
        } finally { Pop-Location }

        $apkUrl = ($output | Out-String | ConvertFrom-Json)[0].artifacts.buildUrl
        if (-not $apkUrl) { throw 'EAS build finished without an APK artifact' }
        Invoke-WebRequest -Uri $apkUrl -OutFile $apkPath
    }
}

if (-not (Test-Path $apkPath)) { throw "No APK at $apkPath" }

Write-Host "Publishing GitHub release $Tag..."
gh release create $Tag $apkPath --title "Habits Tracker $Tag" --notes $Notes --latest
if ($LASTEXITCODE -ne 0) { throw 'gh release create failed' }

Write-Host 'Done. Install link: https://github.com/Chasertx/HabitsTracker/releases/latest/download/HabitsTracker.apk'
