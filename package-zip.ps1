$root = $PSScriptRoot
if (-not $root) { $root = "c:\Users\fusio\Documents\A3\teste-hud" }

$mod = Get-Content (Join-Path $root "module.json") -Raw | ConvertFrom-Json
$ver = $mod.version
$dist = Join-Path $root "dist"
$temp = Join-Path $root "temp_build\teste-hud"

if (Test-Path (Join-Path $root "temp_build")) {
    Remove-Item -Recurse -Force (Join-Path $root "temp_build")
}
New-Item -ItemType Directory -Path $temp -Force | Out-Null

Copy-Item (Join-Path $root "module.json") -Destination $temp
if (Test-Path (Join-Path $root "README.md")) {
    Copy-Item (Join-Path $root "README.md") -Destination $temp
}
Copy-Item -Recurse (Join-Path $root "scripts") -Destination $temp
Copy-Item -Recurse (Join-Path $root "styles") -Destination $temp
Copy-Item -Recurse (Join-Path $root "templates") -Destination $temp
if (Test-Path (Join-Path $root "assets")) {
    Copy-Item -Recurse (Join-Path $root "assets") -Destination $temp
}

if (-not (Test-Path $dist)) {
    New-Item -ItemType Directory -Path $dist -Force | Out-Null
}

$verZip = Join-Path $dist "teste-hud-v$ver.zip"
$genZip = Join-Path $dist "teste-hud.zip"

if (Test-Path $verZip) { Remove-Item -Force $verZip }
if (Test-Path $genZip) { Remove-Item -Force $genZip }

Compress-Archive -Path $temp -DestinationPath $verZip -Force
Copy-Item $verZip -Destination $genZip -Force
Remove-Item -Recurse -Force (Join-Path $root "temp_build")

Write-Host "SUCCESS: teste-hud-v$ver.zip and teste-hud.zip created in $dist"
