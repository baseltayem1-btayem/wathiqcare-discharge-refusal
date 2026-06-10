$ErrorActionPreference = "Stop"

$BaseUrl = "https://wathiqcare.online"
$Stamp = Get-Date -Format yyyyMMddHHmmss

$checks = @(
  @{ Name = "Root Landing"; Url = "$BaseUrl/?v=$Stamp"; ExpectedType = "text/html" },
  @{ Name = "Doctor Workspace"; Url = "$BaseUrl/modules/informed-consents?v=$Stamp"; ExpectedType = "text/html" },
  @{ Name = "Approved Forms Page"; Url = "$BaseUrl/modules/informed-consents/forms?v=$Stamp"; ExpectedType = "text/html" },
  @{ Name = "Approved Forms API"; Url = "$BaseUrl/api/modules/informed-consents/forms?q=anesthesia&v=$Stamp"; ExpectedType = "application/json" },
  @{ Name = "General Anesthesia PDF"; Url = "$BaseUrl/approved-consent-forms/general-anesthesia-consent.pdf?v=$Stamp"; ExpectedType = "application/pdf" },
  @{ Name = "Cholecystectomy PDF"; Url = "$BaseUrl/approved-consent-forms/cholecystectomy-consent.pdf?v=$Stamp"; ExpectedType = "application/pdf" },
  @{ Name = "Appendectomy PDF"; Url = "$BaseUrl/approved-consent-forms/appendectomy-consent.pdf?v=$Stamp"; ExpectedType = "application/pdf" },
  @{ Name = "Regional Anesthesia PDF"; Url = "$BaseUrl/approved-consent-forms/regional-anesthesia-consent.pdf?v=$Stamp"; ExpectedType = "application/pdf" },
  @{ Name = "Endoscopy PDF"; Url = "$BaseUrl/approved-consent-forms/endoscopy-consent.pdf?v=$Stamp"; ExpectedType = "application/pdf" }
)

$results = foreach ($check in $checks) {
  try {
    $response = Invoke-WebRequest $check.Url -UseBasicParsing
    $contentType = [string]$response.Headers["Content-Type"]

    [PSCustomObject]@{
      Name = $check.Name
      Url = $check.Url
      StatusCode = $response.StatusCode
      ContentType = $contentType
      Passed = ($response.StatusCode -eq 200 -and $contentType -like "$($check.ExpectedType)*")
    }
  } catch {
    [PSCustomObject]@{
      Name = $check.Name
      Url = $check.Url
      StatusCode = $_.Exception.Response.StatusCode.value__
      ContentType = ""
      Passed = $false
    }
  }
}

$results | Format-Table -AutoSize

if ($results.Passed -contains $false) {
  throw "Production smoke check failed. Do not continue deployment until all routes pass."
}

Write-Host "Production smoke check passed."
