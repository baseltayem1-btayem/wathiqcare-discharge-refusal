$base='https://wathiqcare.online'

function Get-Status([string]$url,[string]$method='GET',[string]$body=$null){
  try {
    if($method -eq 'GET'){
      $r = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
    } else {
      $r = Invoke-WebRequest -Uri $url -Method $method -Body $body -ContentType 'application/json' -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop
    }
    return [pscustomobject]@{ Url=$url; Method=$method; Status=[int]$r.StatusCode; Location=$r.Headers.Location; Body=$r.Content }
  } catch {
    $resp = $_.Exception.Response
    if($resp){
      $code = [int]$resp.StatusCode
      $loc = $resp.Headers['Location']
      $content = ''
      try {
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $content = $reader.ReadToEnd()
      } catch {}
      return [pscustomobject]@{ Url=$url; Method=$method; Status=$code; Location=$loc; Body=$content }
    }
    return [pscustomobject]@{ Url=$url; Method=$method; Status=-1; Location=''; Body=$_.Exception.Message }
  }
}

# Landing + Arabic check
$landing = Get-Status "$base/"
$login = Get-Status "$base/login"
$landingHasArabic = $false
$loginHasArabic = $false
if($landing.Body){ $landingHasArabic = [regex]::IsMatch($landing.Body,'[\u0600-\u06FF]') }
if($login.Body){ $loginHasArabic = [regex]::IsMatch($login.Body,'[\u0600-\u06FF]') }

# Key admin pages
$adminPaths = @('/platform/audit','/platform/billing','/platform/subscriptions','/platform/tenants','/platform/users')
$adminResults = foreach($p in $adminPaths){ Get-Status "$base$p" }

# Workspace V2
$casesList = Get-Status "$base/api/cases"
$caseId = '10a70708-e5e7-4628-b4ee-f3da4d48bb85'
try {
  $json = $casesList.Body | ConvertFrom-Json
  if($json -is [System.Array] -and $json.Count -gt 0 -and $json[0].id){ $caseId = $json[0].id }
  elseif($json.items -and $json.items.Count -gt 0 -and $json.items[0].id){ $caseId = $json.items[0].id }
} catch {}
$workspace = Get-Status "$base/cases/$caseId/workspace-v2"

# PDF generation + preview/download
$generatePdf = Get-Status "$base/api/cases/$caseId/generate-pdf" 'POST' '{"language":"ar"}'
$pdfVersions = Get-Status "$base/api/cases/$caseId/pdf/versions"
$version='latest'
try {
  $v = $pdfVersions.Body | ConvertFrom-Json
  if($v -is [System.Array] -and $v.Count -gt 0 -and $v[0].version){ $version = $v[0].version }
  elseif($v.items -and $v.items.Count -gt 0 -and $v.items[0].version){ $version = $v.items[0].version }
} catch {}
$pdfPreview = Get-Status "$base/api/cases/$caseId/pdf/$version/preview"
$pdfDownload = Get-Status "$base/api/cases/$caseId/pdf/$version/download"

# Runtime errors in production logs (recent)
$prodErr = vercel logs --environment production --level error --since 60m --no-follow 2>&1 | Out-String

'LANDING_STATUS=' + $landing.Status + ' LOCATION=' + $landing.Location
'LANDING_HAS_ARABIC=' + $landingHasArabic
'LOGIN_STATUS=' + $login.Status + ' LOCATION=' + $login.Location
'LOGIN_HAS_ARABIC=' + $loginHasArabic
'ADMIN_RESULTS_START'
$adminResults | ForEach-Object { "$($_.Url) => $($_.Status) LOCATION=$($_.Location)" }
'ADMIN_RESULTS_END'
'CASES_LIST_STATUS=' + $casesList.Status
'CASE_ID_USED=' + $caseId
'WORKSPACE_STATUS=' + $workspace.Status + ' LOCATION=' + $workspace.Location
'GENERATE_PDF_STATUS=' + $generatePdf.Status
'PDF_VERSIONS_STATUS=' + $pdfVersions.Status
'PDF_PREVIEW_STATUS=' + $pdfPreview.Status
'PDF_DOWNLOAD_STATUS=' + $pdfDownload.Status
'PROD_LOG_ERRORS_START'
$prodErr -split "`n" | Select-Object -First 40
'PROD_LOG_ERRORS_END'
