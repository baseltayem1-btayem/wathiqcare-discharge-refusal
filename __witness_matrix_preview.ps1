$ErrorActionPreference = "Stop"

$base = "https://wathiqcare-discharge-refusal-5bnoel9gk-wathiqcare.vercel.app"
$caseId = "c424971f-81d2-404e-b521-ea14fb87113a"
$credentialCandidates = @(
  @{ email = "output.tester@wathiqcare.online"; password = "Output@Test123!" },
  @{ email = "admin@wathiqcare.online"; password = "WathiqAdmin@011778" },
  @{ email = "admin@wathiqcare.online"; password = "Platform@Wathiqcare2026!" },
  @{ email = "admin@wathiqcare.online"; password = "Admin@Wathiqcare2026!" },
  @{ email = "tenant_admin@demo.com"; password = "Demo@123" }
)

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    $Body = $null
  )

  $uri = "$base$Path"
  $json = $null
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 30
  }

  try {
    if ($null -ne $Body) {
      $resp = Invoke-WebRequest -Method $Method -Uri $uri -WebSession $session -ContentType "application/json" -Body $json -TimeoutSec 120
    } else {
      $resp = Invoke-WebRequest -Method $Method -Uri $uri -WebSession $session -TimeoutSec 120
    }

    $status = [int]$resp.StatusCode
    $txt = $resp.Content
    $obj = $null
    if ($txt) {
      try { $obj = $txt | ConvertFrom-Json -Depth 40 } catch {}
    }

    $code = $null
    $msg = $null
    if ($obj) {
      $code = $obj.code
      $msg = ($obj.error, $obj.detail, $obj.message | Where-Object { $_ } | Select-Object -First 1)
    }

    return [pscustomobject]@{
      status = $status
      code = $code
      message = $msg
      body = $obj
    }
  } catch {
    $status = 0
    $txt = ""
    $obj = $null
    $code = $null
    $msg = $_.Exception.Message

    if ($_.Exception.Response) {
      $r = $_.Exception.Response
      try { $status = [int]$r.StatusCode.value__ } catch { try { $status = [int]$r.StatusCode } catch {} }
      $stream = $r.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $txt = $reader.ReadToEnd()
        $reader.Close()
      }
      if ($txt) {
        try { $obj = $txt | ConvertFrom-Json -Depth 40 } catch {}
      }
      if ($obj) {
        $code = $obj.code
        $msg = ($obj.error, $obj.detail, $obj.message | Where-Object { $_ } | Select-Object -First 1)
      }
    }

    return [pscustomobject]@{
      status = $status
      code = $code
      message = $msg
      body = $obj
    }
  }
}

function Witness-Body {
  param(
    [string]$name,
    [string]$role,
    [string]$category,
    [string]$idno,
    [string]$mobile,
    [string]$sig
  )

  return @{
    action = "add"
    full_name = $name
    role = $role
    role_category = $category
    id_type = "NATIONAL_ID"
    id_number = $idno
    mobile_number = $mobile
    attestation_confirmed = $true
    attestation_language = "en"
    attestation_version = "1.0"
    signature_type = "DIGITAL_SIGNATURE"
    signature_hash = $sig
    verification_status = "VERIFIED"
    manual_fallback_used = $false
  }
}

function Clear-Witnesses {
  $caseResp = Invoke-Api "GET" "/api/cases/$caseId"
  if ($caseResp.status -ge 200 -and $caseResp.status -lt 300) {
    $meta = $caseResp.body.metadata
    if ($meta -and $meta.witnesses) {
      foreach ($w in @($meta.witnesses)) {
        if ($w.witness_id) {
          [void](Invoke-Api "POST" "/api/discharge/cases/$caseId/witness" @{ action = "remove"; witness_id = $w.witness_id })
        }
      }
    }
  }
}

$login = $null
$activeCredential = $null
foreach ($cred in $credentialCandidates) {
  $attempt = Invoke-Api "POST" "/api/auth/password/login" @{ email = $cred.email; password = $cred.password }
  if ($attempt.status -ge 200 -and $attempt.status -lt 300) {
    $login = $attempt
    $activeCredential = $cred
    break
  }
}

if ($null -eq $login) {
  [pscustomobject]@{
    base = $base
    caseId = $caseId
    loginStatus = 401
    error = "Login failed for all credential candidates"
    attemptedEmails = @($credentialCandidates | ForEach-Object { $_.email })
  } | ConvertTo-Json -Depth 20
  exit 1
}

$consentPayload = @{
  processingPurpose = "Matrix consent test"
  lawfulBasis = "PDPL legal basis"
  consentType = "informed_refusal_consent"
  consentMethod = "ELECTRONIC_SIGNATURE"
  documentVersion = "1.0"
  witnessName = "Matrix Witness"
}

$sigPayload = @{
  patient_decision = "accepted"
  outcome = "signed"
  signer_name = "Matrix Patient"
  signer_role = "patient"
  identity_verified = $true
}

$results = @()

Clear-Witnesses
$a = Invoke-Api "POST" "/api/discharge/cases/$caseId/consent" $consentPayload
$results += [pscustomobject]@{
  scenario = "A-0-witnesses-consent"
  expected = "400/MIN_WITNESSES_REQUIRED"
  status = $a.status
  code = $a.code
  message = $a.message
  pass = ($a.status -eq 400 -and $a.code -eq "MIN_WITNESSES_REQUIRED")
}

Clear-Witnesses
[void](Invoke-Api "POST" "/api/discharge/cases/$caseId/witness" (Witness-Body "Dr Matrix One" "Doctor" "clinical" "1234567890" "+966512345678" "sig-w1"))
$b = Invoke-Api "POST" "/api/discharge/cases/$caseId/consent" $consentPayload
$results += [pscustomobject]@{
  scenario = "B-1-witness-consent"
  expected = "400/MIN_WITNESSES_REQUIRED"
  status = $b.status
  code = $b.code
  message = $b.message
  pass = ($b.status -eq 400 -and $b.code -eq "MIN_WITNESSES_REQUIRED")
}

Clear-Witnesses
[void](Invoke-Api "POST" "/api/discharge/cases/$caseId/witness" (Witness-Body "Dr Matrix One" "Doctor" "clinical" "1234567890" "+966512345678" "sig-w1"))
$c = Invoke-Api "POST" "/api/discharge/cases/$caseId/witness" (Witness-Body "Mr Dup Two" "Family" "non_clinical" "1234567890" "+966512345678" "sig-w2dup")
$results += [pscustomobject]@{
  scenario = "C-duplicate-identity"
  expected = "400/WITNESS_IDENTITY_NOT_VERIFIED"
  status = $c.status
  code = $c.code
  message = $c.message
  pass = ($c.status -eq 400 -and $c.code -eq "WITNESS_IDENTITY_NOT_VERIFIED")
}

Clear-Witnesses
[void](Invoke-Api "POST" "/api/discharge/cases/$caseId/witness" (Witness-Body "Dr Matrix One" "Doctor" "clinical" "1234567890" "+966512345678" "sig-w1"))
$d = Invoke-Api "POST" "/api/discharge/cases/$caseId/witness" (Witness-Body "Nurse Matrix Two" "Nurse" "clinical" "9988776655" "+966500000001" "sig-w2c")
$results += [pscustomobject]@{
  scenario = "D-role-composition-invalid"
  expected = "400/INVALID_WITNESS_COMPOSITION"
  status = $d.status
  code = $d.code
  message = $d.message
  pass = ($d.status -eq 400 -and $d.code -eq "INVALID_WITNESS_COMPOSITION")
}

Clear-Witnesses
$e1 = Invoke-Api "POST" "/api/discharge/cases/$caseId/witness" (Witness-Body "Dr Matrix One" "Doctor" "clinical" "1234567890" "+966512345678" "sig-w1")
$e2 = Invoke-Api "POST" "/api/discharge/cases/$caseId/witness" (Witness-Body "Mr Matrix Two" "Family" "non_clinical" "A7788991" "0555555555" "sig-w2")
$e3 = Invoke-Api "POST" "/api/discharge/cases/$caseId/consent" $consentPayload
$e4 = Invoke-Api "POST" "/api/discharge/cases/$caseId/signature" $sigPayload
$e5 = Invoke-Api "POST" "/api/discharge/cases/$caseId/legal-package" @{}
$e6 = Invoke-Api "POST" "/api/cases/$caseId/generate-pdf" @{ mode = "final"; language = "en" }
$ePass = (
  $e1.status -ge 200 -and $e1.status -lt 300 -and
  $e2.status -ge 200 -and $e2.status -lt 300 -and
  $e3.status -ge 200 -and $e3.status -lt 300 -and
  $e4.status -ge 200 -and $e4.status -lt 300 -and
  $e5.status -ge 200 -and $e5.status -lt 300 -and
  $e6.status -ge 200 -and $e6.status -lt 300
)
$results += [pscustomobject]@{
  scenario = "E-two-valid-witnesses-end-to-end"
  expected = "all success"
  status = "$($e1.status),$($e2.status),$($e3.status),$($e4.status),$($e5.status),$($e6.status)"
  code = "$($e3.code)|$($e4.code)|$($e5.code)|$($e6.code)"
  message = ($e3.message, $e4.message, $e5.message, $e6.message | Where-Object { $_ } | Select-Object -First 1)
  pass = $ePass
}

$lr = Invoke-Api "GET" "/api/discharge/cases/$caseId/legal-readiness"
$rd = Invoke-Api "GET" "/api/discharge/cases/$caseId/readiness"

[pscustomobject]@{
  base = $base
  caseId = $caseId
  loginStatus = $login.status
  loginEmail = $activeCredential.email
  scenarios = $results
  legalReadiness = [pscustomobject]@{
    status = $lr.status
    readyForLegal = $lr.body.readyForLegal
    blockers = @($lr.body.blockers)
  }
  readiness = [pscustomobject]@{
    status = $rd.status
    ready_for_legal = $rd.body.ready_for_legal
    reason = $rd.body.reason
  }
} | ConvertTo-Json -Depth 30
