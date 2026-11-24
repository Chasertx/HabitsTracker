<#
.SYNOPSIS
  Builds the Android APK with EAS and publishes it as a GitHub Release.

.DESCRIPTION
  The APK is always uploaded as HabitsTracker.apk, so this link (and the QR code in the
  README) always installs the newest release:
  https://github.com/Chasertx/HabitsTracker/releases/latest/download/HabitsTracker.apk

.EXAMPLE
  ./scripts/release-android.ps1 -Tag v1.0.1 -Notes "Fix set editing"
#>
param(
    [Parameter(Mandatory)] [string] $Tag,
    [string] $Notes = 'Android build. Install HabitsTracker.apk on your phone.'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'publish'
$apkPath = Join-Path $outDir 'HabitsTracker.apk'
New-Item -ItemType Directory -Force $outDir | Out-Null

Write-Host 'Building APK on EAS (this takes several minutes)...'
Push-Location (Join-Path $root 'mobile')
try {
    $output = npx eas-cli@latest build --platform android --profile preview --non-interactive --wait --json
    if ($LASTEXITCODE -ne 0) { throw 'EAS build failed' }
} finally {
    Pop-Location
}

$build = ($output | Out-String | ConvertFrom-Json)[0]
$apkUrl = $build.artifacts.buildUrl
if (-not $apkUrl) { throw 'EAS build finished without an APK artifact' }

Write-Host "Downloading $apkUrl"
Invoke-WebRequest -Uri $apkUrl -OutFile $apkPath

Write-Host "Publishing GitHub release $Tag..."
gh release create $Tag $apkPath --title "Habits Tracker $Tag" --notes $Notes --latest
if ($LASTEXITCODE -ne 0) { throw 'gh release create failed' }

Write-Host 'Done. Install link: https://github.com/Chasertx/HabitsTracker/releases/latest/download/HabitsTracker.apk'
