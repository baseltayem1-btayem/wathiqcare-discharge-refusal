$loginBody = @{
    email = "legal.admin@imc.med.sa"
    password = "WathiqCare@2026"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "https://wathiqcare.online/api/auth/password/login" -Method Post -Body $loginBody -ContentType "application/json" -SessionVariable sess
    $loginStatus = $loginResponse.StatusCode
} catch {
    $loginStatus = $_.Exception.Response.StatusCode.value__
    $loginError = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($loginError)
    $loginErrorBody = $reader.ReadToEnd()
}

if ($loginStatus -eq 200) {
    try {
        $caseResponse = Invoke-RestMethod -Uri "https://wathiqcare.online/api/cases?limit=1" -WebSession $sess
        $caseId = $caseResponse.data[0].id
        
        $signLinkBody = @{ mobileNumber = "966543587772" } | ConvertTo-Json
        $signLinkResponse = Invoke-RestMethod -Uri "https://wathiqcare.online/api/discharge/cases/$caseId/secure-signing-link" -Method Post -Body $signLinkBody -ContentType "application/json" -WebSession $sess
        
        $signingUrl = $signLinkResponse.workflow.signingUrl
        $token = $signLinkResponse.token
        $tokenLast8 = $token.Substring($token.Length - 8)
        
        $otpBody = @{ mobileNumber = "966543587772"; locale = "ar" } | ConvertTo-Json
        $otpResponse = Invoke-RestMethod -Uri "https://wathiqcare.online/api/sign/$token/request-otp" -Method Post -Body $otpBody -ContentType "application/json" -WebSession $sess
        
        $output = @{
            loginStatus = $loginStatus
            caseId = $caseId
            signingUrl = $signingUrl
            tokenLast8 = $tokenLast8
            otpRequestStatus = 200
            challengeId = $otpResponse.challengeId
            maskedPhone = $otpResponse.maskedPhone
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
    } catch {
        $output = @{
            loginStatus = $loginStatus
            error = $_.Exception.Message
            rawError = $_.ErrorDetails.Message
            timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
    }
} else {
    $output = @{
        loginStatus = $loginStatus
        loginErrorBody = $loginErrorBody
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    }
}

$output | ConvertTo-Json
