$loginUrl = "https://wathiqcare.online/api/auth/password/login"
$meUrl = "https://wathiqcare.online/api/auth/me"
$creds = @(
    @{ email = "admin@wathiqcare.online"; password = "Admin@Wathiqcare2026!" },
    @{ email = "admin@wathiqcare.med.sa"; password = "Platform@Wathiqcare2026!" }
)

foreach ($cred in $creds) {
    Write-Host "--- Attempting Login: $($cred.email) ---"
    $body = @{ email = $cred.email; password = $cred.password } | ConvertTo-Json
    try {
        $loginResponse = Invoke-WebRequest -Uri $loginUrl -Method Post -Body $body -ContentType "application/json" -SessionVariable 'sess' -ErrorAction Stop
        Write-Host "Login Success: $($loginResponse.StatusCode)"
        
        Write-Host "Fetching Profile (/api/auth/me)..."
        $meResponse = Invoke-WebRequest -Uri $meUrl -Method Get -WebSession $sess -ErrorAction Stop
        
        Write-Host "Profile Success: $($meResponse.StatusCode)"
        Write-Host "Response Body: $($meResponse.Content)"
        exit 0
    } catch {
        Write-Host "Failed: $($_.Exception.Message)"
        if ($_.ErrorDetails) { Write-Host "Details: $($_.ErrorDetails)" }
    }
}
exit 1
