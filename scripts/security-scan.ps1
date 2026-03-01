Param(
  [string]$RepoRoot = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Print-Section([string]$title) {
  Write-Host ""
  Write-Host ("=" * 80)
  Write-Host $title
  Write-Host ("=" * 80)
}

function Run-Rg([string]$pattern, [string[]]$paths) {
  try {
    rg -n -S $pattern @paths
  } catch {
    Write-Host "No matches."
  }
}

Push-Location $RepoRoot
try {
  Print-Section "Security Scan - Dependency Audit (npm)"
  try {
    npm.cmd audit --omit=dev
  } catch {
    Write-Host "npm audit failed (usually network-restricted environment)."
  }

  Print-Section "Security Scan - Edge Functions JWT/CORS Config"
  Run-Rg "verify_jwt\s*=\s*false|Access-Control-Allow-Origin|SUPABASE_SERVICE_ROLE_KEY|createAdminClient" @("supabase")

  Print-Section "Security Scan - Potential Secret Exposure"
  Run-Rg "EXPO_PUBLIC_|SUPABASE_SERVICE_ROLE_KEY|COLLAR_SHARED_SECRET|GOOGLE_MAPS_API_KEY|password|token|secret|apikey" @(
    ".env",
    ".env.example",
    "app.json",
    "app.config.js",
    "README.md",
    ".github",
    "src",
    "supabase"
  )

  Print-Section "Security Scan - HMAC/Replay & Auth Logic"
  Run-Rg "HMAC|signature|Authorization|getUser\(|refreshSession|token_de_outro_projeto|auth_obrigatorio" @("src", "supabase")

  Print-Section "Security Scan - Summary"
  Write-Host "Review findings manually with focus on:"
  Write-Host "1) verify_jwt disabled endpoints"
  Write-Host "2) wildcard CORS"
  Write-Host "3) replay protection for ingest-gps"
  Write-Host "4) brute-force protection for activation flow"
  Write-Host "5) any accidental secret in tracked files"
}
finally {
  Pop-Location
}
