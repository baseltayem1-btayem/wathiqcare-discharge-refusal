$ErrorActionPreference = "Stop"

$Files = @(
  "apps\web\app\modules\informed-consents\page.tsx",
  "apps\web\src\components\informed-consents\enterprise-workflow\ApprovedFigmaConsentWorkspace.tsx",
  "apps\web\src\components\informed-consents\enterprise-workflow\ConsentSearchEngine.tsx"
)

foreach ($File in $Files) {
  if (!(Test-Path $File)) {
    throw "Missing required production file: $File"
  }
}

$Route = Get-Content "apps\web\app\modules\informed-consents\page.tsx" -Raw
$Workspace = Get-Content "apps\web\src\components\informed-consents\enterprise-workflow\ApprovedFigmaConsentWorkspace.tsx" -Raw
$SearchEngine = Get-Content "apps\web\src\components\informed-consents\enterprise-workflow\ConsentSearchEngine.tsx" -Raw

if ($Route -notmatch "ApprovedFigmaConsentWorkspace") {
  throw "Production route is not wired to ApprovedFigmaConsentWorkspace"
}

if ($Route -match "FinalInformedConsentsModule|StableFigmaInformedConsentsFrame|prototype|mock") {
  throw "Production route still references prototype/legacy component"
}

$RequiredWorkspaceSignals = @(
  "useWathiqCareEnterpriseBridge",
  "toggleLanguage",
  "openNewConsent",
  "refreshDashboard",
  "selectForPhysicianReview",
  "Languages",
  "Bell",
  "onClick",
  "apiBusy",
  "apiError"
)

foreach ($Signal in $RequiredWorkspaceSignals) {
  if ($Workspace -notmatch [regex]::Escape($Signal)) {
    throw "Missing production wiring signal in physician workspace: $Signal"
  }
}

$RequiredApiRoutes = @(
  "api/modules/informed-consents",
  "api/modules/informed-consents/documents",
  "api/modules/informed-consents/imc-library",
  "api/modules/informed-consents/templates",
  "api/modules/informed-consents/patients/search",
  "api/modules/informed-consents/status-tracking"
)

$BuildManifestProbe = Get-ChildItem -Path "apps\web\app\api\modules\informed-consents" -Recurse -Filter "route.ts" | Select-Object -ExpandProperty FullName

foreach ($Api in $RequiredApiRoutes) {
  $ApiPath = $Api -replace "^api/", "apps\web\app\api\" -replace "/", "\"
  if (!(Test-Path $ApiPath)) {
    throw "Missing backend API route folder: $ApiPath"
  }
}

$InertButtonPattern = '<button(?![^>]*(onClick|type="submit"|aria-hidden|disabled|data-|form=|role=))[^>]*>'
$WorkspaceInertButtons = [regex]::Matches($Workspace, $InertButtonPattern)
$SearchEngineInertButtons = [regex]::Matches($SearchEngine, $InertButtonPattern)

if ($WorkspaceInertButtons.Count -gt 0) {
  $WorkspaceInertButtons | ForEach-Object { Write-Host $_.Value }
  throw "Detected inert button(s) in ApprovedFigmaConsentWorkspace"
}

if ($SearchEngineInertButtons.Count -gt 0) {
  $SearchEngineInertButtons | ForEach-Object { Write-Host $_.Value }
  throw "Detected inert button(s) in ConsentSearchEngine"
}

$PrototypeMarkers = "prototype|mock only|placeholder|not wired|TODO: wire|static demo|hardcoded only|localhost|pnpm dev|npm run dev"
$EnterpriseFiles = Get-ChildItem "apps\web\src\components\informed-consents\enterprise-workflow" -Recurse -Include *.tsx,*.ts

foreach ($File in $EnterpriseFiles) {
  $Text = Get-Content $File.FullName -Raw
  if ($Text -match $PrototypeMarkers) {
    throw "Prototype/local marker detected in: $($File.FullName)"
  }
}

$ProductionUrl = "https://wathiqcare.online"

$Health = Invoke-WebRequest -Uri "$ProductionUrl/api/health" -UseBasicParsing -TimeoutSec 30
if ($Health.StatusCode -ne 200) {
  throw "Production health check failed"
}

$Module = Invoke-WebRequest -Uri "$ProductionUrl/modules/informed-consents" -UseBasicParsing -TimeoutSec 30
if ($Module.StatusCode -notin @(200, 302, 307, 308)) {
  throw "Production informed-consents module did not respond correctly"
}

Write-Host "WATHIQCARE_PRODUCTION_ICON_AND_API_SMOKE_PASS"
