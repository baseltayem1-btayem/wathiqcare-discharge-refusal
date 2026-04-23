$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http
$base = "http://localhost:3000"
$caseId = "1def766c-b613-497b-a938-5aa379cdfd07"
$handler = New-Object System.Net.Http.HttpClientHandler
$handler.UseCookies = $true
$handler.CookieContainer = New-Object System.Net.CookieContainer
$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [TimeSpan]::FromSeconds(120)
function Read-Response($response) {
  $bytes = $response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
  $text = [System.Text.Encoding]::UTF8.GetString($bytes)
  [pscustomobject]@{
    StatusCode = [int]$response.StatusCode
    ReasonPhrase = $response.ReasonPhrase
    ContentType = if ($response.Content.Headers.ContentType) { $response.Content.Headers.ContentType.ToString() } else { $null }
    SizeBytes = $bytes.Length
    BodyText = $text
  }
}
$loginJson = '{"email":"output.tester@wathiqcare.online","password":"Output@Test123!"}'
$loginContent = New-Object System.Net.Http.StringContent($loginJson, [System.Text.Encoding]::UTF8, 'application/json')
$loginResponse = $client.PostAsync("$base/api/auth/password/login", $loginContent).GetAwaiter().GetResult()
$login = Read-Response $loginResponse
$loginBody = $login.BodyText | ConvertFrom-Json
$cookie = $handler.CookieContainer.GetCookies($base)['wathiqcare_access_token']
$draftJson = '{"mode":"draft","language":"en"}'
$draftContent = New-Object System.Net.Http.StringContent($draftJson, [System.Text.Encoding]::UTF8, 'application/json')
$draftResponse = $client.PostAsync("$base/api/cases/$caseId/generate-pdf", $draftContent).GetAwaiter().GetResult()
$draft = Read-Response $draftResponse
$draftBody = if ($draft.ContentType -like 'application/json*' -and $draft.BodyText) { $draft.BodyText | ConvertFrom-Json } else { $null }
$finalJson = '{"mode":"final","language":"en"}'
$finalContent = New-Object System.Net.Http.StringContent($finalJson, [System.Text.Encoding]::UTF8, 'application/json')
$finalResponse = $client.PostAsync("$base/api/cases/$caseId/generate-pdf", $finalContent).GetAwaiter().GetResult()
$final = Read-Response $finalResponse
$finalBody = if ($final.ContentType -like 'application/json*' -and $final.BodyText) { $final.BodyText | ConvertFrom-Json } else { $null }
$versionsResponse = $client.GetAsync("$base/api/cases/$caseId/pdf/versions").GetAwaiter().GetResult()
$versions = Read-Response $versionsResponse
$versionsBody = if ($versions.ContentType -like 'application/json*' -and $versions.BodyText) { $versions.BodyText | ConvertFrom-Json } else { $null }
$allVersions = @()
if ($versionsBody -and $versionsBody.versions) { $allVersions = @($versionsBody.versions) }
elseif ($versionsBody -and $versionsBody.data -and $versionsBody.data.versions) { $allVersions = @($versionsBody.data.versions) }
$finalVersionItem = $allVersions | Where-Object { $_.isFinal -eq $true } | Sort-Object {[int]$_.version} -Descending | Select-Object -First 1
$finalVersion = if ($finalVersionItem) { [int]$finalVersionItem.version } else { $null }
$preview = $null
$download = $null
if ($finalVersion) {
  $previewResponse = $client.GetAsync("$base/api/cases/$caseId/pdf/$finalVersion/preview").GetAwaiter().GetResult()
  $preview = Read-Response $previewResponse
  $downloadResponse = $client.GetAsync("$base/api/cases/$caseId/pdf/$finalVersion/download").GetAwaiter().GetResult()
  $download = Read-Response $downloadResponse
}
$result = [pscustomobject]@{
  Login = [pscustomobject]@{
    StatusCode = $login.StatusCode
    ContentType = $login.ContentType
    CookieCaptured = [bool]$cookie
    CookieName = if ($cookie) { $cookie.Name } else { $null }
    RedirectTo = $loginBody.redirectTo
    UserType = $loginBody.userType
  }
  DraftGenerate = [pscustomobject]@{
    StatusCode = $draft.StatusCode
    ContentType = $draft.ContentType
    SizeBytes = $draft.SizeBytes
    Version = if ($draftBody.version) { $draftBody.version } elseif ($draftBody.data.version) { $draftBody.data.version } else { $null }
    IsFinal = if ($draftBody.isFinal -ne $null) { $draftBody.isFinal } elseif ($draftBody.data.isFinal -ne $null) { $draftBody.data.isFinal } else { $null }
    Detail = if ($draftBody.detail) { $draftBody.detail } else { $null }
  }
  FinalGenerate = [pscustomobject]@{
    StatusCode = $final.StatusCode
    ContentType = $final.ContentType
    SizeBytes = $final.SizeBytes
    Version = if ($finalBody.version) { $finalBody.version } elseif ($finalBody.data.version) { $finalBody.data.version } else { $null }
    IsFinal = if ($finalBody.isFinal -ne $null) { $finalBody.isFinal } elseif ($finalBody.data.isFinal -ne $null) { $finalBody.data.isFinal } else { $null }
    Detail = if ($finalBody.detail) { $finalBody.detail } else { $null }
  }
  Versions = [pscustomobject]@{
    StatusCode = $versions.StatusCode
    ContentType = $versions.ContentType
    Count = $allVersions.Count
    FinalVersion = $finalVersion
    Items = @($allVersions | Sort-Object {[int]$_.version} | ForEach-Object {
      [pscustomobject]@{
        version = $_.version
        isFinal = $_.isFinal
        storageMode = $_.storageMode
        sizeBytes = $_.sizeBytes
        language = $_.language
        createdAt = $_.createdAt
      }
    })
  }
  Preview = if ($preview) {
    [pscustomobject]@{
      StatusCode = $preview.StatusCode
      ContentType = $preview.ContentType
      SizeBytes = $preview.SizeBytes
      IsPdf = ($preview.ContentType -like 'application/pdf*')
    }
  } else { $null }
  Download = if ($download) {
    [pscustomobject]@{
      StatusCode = $download.StatusCode
      ContentType = $download.ContentType
      SizeBytes = $download.SizeBytes
      IsPdf = ($download.ContentType -like 'application/pdf*')
    }
  } else { $null }
}
$result | ConvertTo-Json -Depth 8
