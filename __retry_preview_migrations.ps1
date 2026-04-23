$ErrorActionPreference = 'Continue'
Write-Host 'STEP 1: Pull preview env for branch safe/arabic-localization-full'
vercel env pull .env.preview.branch.local --environment=preview --git-branch='safe/arabic-localization-full' --yes
$vercelExit = $LASTEXITCODE
Write-Host "VERCEL_EXIT=$vercelExit"
if ($vercelExit -ne 0) { Write-Host 'Vercel env pull failed.' }

Write-Host 'STEP 2: Load env vars from .env.preview.branch.local'
if (Test-Path '.env.preview.branch.local') {
  Get-Content '.env.preview.branch.local' | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith('#')) {
      $idx = $line.IndexOf('=')
      if ($idx -gt 0) {
        $name = $line.Substring(0, $idx)
        $value = $line.Substring($idx + 1)
        if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
          $value = $value.Substring(1, $value.Length - 2)
        }
        [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
      }
    }
  }
  if ($env:DATABASE_URL_UNPOOLED) {
    $env:DATABASE_URL = $env:DATABASE_URL_UNPOOLED
    Write-Host 'DATABASE_URL overridden from DATABASE_URL_UNPOOLED'
  } else {
    Write-Host 'DATABASE_URL_UNPOOLED not present; DATABASE_URL left as loaded'
  }
} else {
  Write-Host 'Missing .env.preview.branch.local'
}

Write-Host 'STEP 3: Set PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1'
$env:PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = '1'

Write-Host 'STEP 4: Run migrate deploy for apps/web/prisma/schema.prisma'
npx prisma migrate deploy --schema apps/web/prisma/schema.prisma
$webExit = $LASTEXITCODE
Write-Host "WEB_MIGRATE_EXIT=$webExit"

Write-Host 'STEP 5: Run migrate deploy for prisma/schema.prisma if present'
if (Test-Path 'prisma/schema.prisma') {
  npx prisma migrate deploy --schema prisma/schema.prisma
  $rootExit = $LASTEXITCODE
  Write-Host "ROOT_MIGRATE_EXIT=$rootExit"
} else {
  $rootExit = -1
  Write-Host 'ROOT_MIGRATE_SKIPPED=missing'
}

if (($vercelExit -eq 0) -and ($webExit -eq 0) -and (($rootExit -eq 0) -or ($rootExit -eq -1))) {
  Write-Host 'OVERALL_RESULT=SUCCESS'
} else {
  Write-Host 'OVERALL_RESULT=FAILURE'
}
