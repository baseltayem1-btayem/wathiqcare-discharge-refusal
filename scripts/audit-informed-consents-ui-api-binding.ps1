$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$TargetPaths = @(
  'apps/web/src/app/modules/informed-consents',
  'apps/web/src/components/informed-consents',
  'apps/web/src/app/api/modules/informed-consents',
  'apps/web/src/lib',
  'prisma'
)

$OutputDir = 'docs/wathiqcare'
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$Report = Join-Path $OutputDir 'UI_API_BINDING_AUDIT_REPORT.md'

$InitialLines = @(
  '# WathiqCare UI/API Binding Audit Report',
  '',
  ('Generated: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')),
  '',
  '## Files scanned'
)

Set-Content -Path $Report -Encoding UTF8 -Value $InitialLines

foreach ($p in $TargetPaths) {
  if (Test-Path $p) {
    Add-Content -Path $Report -Encoding UTF8 -Value ('- ' + $p)
  }
}

Add-Content -Path $Report -Encoding UTF8 -Value ''

function Add-Section {
  param(
    [string]$Title,
    [string]$Pattern,
    [string]$ScanPath
  )

  Add-Content -Path $Report -Encoding UTF8 -Value ('## ' + $Title)
  Add-Content -Path $Report -Encoding UTF8 -Value ''

  $result = $null

  if (Get-Command rg -ErrorAction SilentlyContinue) {
    $result = rg -n --glob '*.{ts,tsx,js,jsx,prisma}' $Pattern $ScanPath 2>$null
  } else {
    $files = Get-ChildItem $ScanPath -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.prisma -ErrorAction SilentlyContinue
    $result = $files | Select-String -Pattern $Pattern
  }

  if ($result) {
    Add-Content -Path $Report -Encoding UTF8 -Value 'BEGIN MATCHES'
    $result | Add-Content -Path $Report -Encoding UTF8
    Add-Content -Path $Report -Encoding UTF8 -Value 'END MATCHES'
  } else {
    Add-Content -Path $Report -Encoding UTF8 -Value '_No matches found._'
  }

  Add-Content -Path $Report -Encoding UTF8 -Value ''
}

foreach ($p in $TargetPaths) {
  if (Test-Path $p) {
    Add-Section -Title ('Buttons and clickable handlers in ' + $p) -Pattern '<button|onClick=|role=.*button|cursor-pointer' -ScanPath $p
    Add-Section -Title ('Inputs selects and forms in ' + $p) -Pattern '<input|<select|<textarea|useForm|FormField|name=' -ScanPath $p
    Add-Section -Title ('API calls in ' + $p) -Pattern 'fetch\(|axios\.|api/modules/informed-consents|/api/' -ScanPath $p
    Add-Section -Title ('Mock static placeholder risks in ' + $p) -Pattern 'mock|placeholder|TODO|FIXME|dummy|sample|static|hardcoded|Ready' -ScanPath $p
    Add-Section -Title ('Loading error and empty states in ' + $p) -Pattern 'loading|isLoading|error|isError|empty|No results|not found' -ScanPath $p
    Add-Section -Title ('Audit and logging references in ' + $p) -Pattern 'audit|Audit|logEvent|ConsentAudit|timeline' -ScanPath $p
  }
}

$Checklist = @(
  '',
  '## Required manual closure checklist',
  '',
  '- [ ] Create Consent: all 8 steps connected to APIs.',
  '- [ ] Pending Consents: queue data reminders resend cancel connected.',
  '- [ ] Consent Records: archive search PDF evidence package connected.',
  '- [ ] Approved Forms: template library preview governance connected.',
  '- [ ] Anesthesia Queue: same consent case review connected.',
  '- [ ] Patient Education: library attach send acknowledgement connected.',
  '- [ ] Compliance Review: readiness score missing items legal controls connected.',
  '- [ ] Audit Trail: timeline signature evidence export connected.',
  '- [ ] Settings and Support: legal support technical ticket settings connected.',
  '- [ ] No production mock data.',
  '- [ ] No dead buttons.',
  '- [ ] No unvalidated required fields.',
  '- [ ] Every write action has audit event.',
  '- [ ] Every page has loading error empty states.',
  '- [ ] Every protected action has RBAC.'
)

Add-Content -Path $Report -Encoding UTF8 -Value $Checklist

Write-Host ('Audit report created: ' + $Report)
