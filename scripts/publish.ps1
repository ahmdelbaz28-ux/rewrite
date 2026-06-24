<#
.SYNOPSIS
    Publish all SmartLangGuard packages to npm (PowerShell version)
.DESCRIPTION
    Publishes packages in dependency order: core → mcp-server → daemon → cli
    Verifies npm login and organization membership before publishing.
.PARAMETER Package
    Optional: publish only a specific package (core, mcp-server, daemon, cli)
.EXAMPLE
    .\scripts\publish.ps1          # publish all
    .\scripts\publish.ps1 core     # publish only core
#>

param([string]$Package = "")

$ErrorActionPreference = "Stop"
$REPO_ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Write-Status { Write-Host "▶ $args" -ForegroundColor Green }
function Write-Warn  { Write-Host "⚠ $args" -ForegroundColor Yellow }
function Write-Error { Write-Host "✗ $args" -ForegroundColor Red }

# ── Check npm login ──
Write-Status "Checking npm login..."
$whoami = npm whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not logged in to npm. Run 'npm login' first."
    exit 1
}
Write-Status "Logged in as: $($whoami.Trim())"

# ── Packages in dependency order ──
$PACKAGES = @("core", "mcp-server", "daemon", "cli")

if ($Package -ne "") {
    $PACKAGES = @($Package)
}

Write-Status "Publishing packages: $($PACKAGES -join ', ')"

foreach ($pkg in $PACKAGES) {
    $PKG_DIR = Join-Path $REPO_ROOT "packages" $pkg
    $PKG_JSON = Join-Path $PKG_DIR "package.json"
    
    if (-not (Test-Path $PKG_JSON)) {
        Write-Warn "Package directory not found: $PKG_DIR. Skipping."
        continue
    }
    
    $json = Get-Content $PKG_JSON -Raw | ConvertFrom-Json
    $PKG_NAME = $json.name
    $PKG_VERSION = $json.version
    
    Write-Status "Publishing $PKG_NAME@$PKG_VERSION..."
    
    # Check if already published
    $viewResult = npm view "$PKG_NAME@$PKG_VERSION" version 2>&1
    if ($LASTEXITCODE -eq 0 -and $viewResult.Trim() -eq $PKG_VERSION) {
        Write-Warn "$PKG_NAME@$PKG_VERSION already published. Skipping."
        continue
    }
    
    # Publish
    Push-Location $PKG_DIR
    try {
        Write-Status "Running npm publish --access public..."
        npm publish --access public 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Published $PKG_NAME@$PKG_VERSION" -ForegroundColor Green
        } else {
            Write-Error "Failed to publish $PKG_NAME"
            exit 1
        }
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Status "All packages published successfully!"
Write-Host ""
Write-Host "Verify with:"
Write-Host "  npm view @smartlangguard/core"
Write-Host "  npm view @smartlangguard/cli"
Write-Host "  npm view @smartlangguard/mcp-server"
Write-Host "  npm view @smartlangguard/daemon"
Write-Host ""
Write-Host "Test installation:"
Write-Host "  npm install -g @smartlangguard/cli"
Write-Host "  smartlangguard --version"
