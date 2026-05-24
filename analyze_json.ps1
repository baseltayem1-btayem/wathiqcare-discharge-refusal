$path = "C:\work\wathiqcare-discharge-refusal-main\__phase22_content_package.json"
$json = Get-Content $path -Raw | ConvertFrom-Json
$first = $json.templates[0]
$first | ConvertTo-Json -Depth 100
Write-Host "----- SECOND TEMPLATE TOP-LEVEL KEYS -----"
$json.templates[1].PSObject.Properties.Name -join ","
Write-Host "----- requiredTemplateSections -----"
$json.requiredTemplateSections | ConvertTo-Json -Depth 100
Write-Host "----- coverageRegistry -----"
$json.coverageRegistry | ConvertTo-Json -Depth 100
Write-Host "----- validationRules -----"
$json.validationRules | ConvertTo-Json -Depth 100
Write-Host "----- scoringRules -----"
$json.scoringRules | ConvertTo-Json -Depth 100
Write-Host "----- evidencePackageHooks -----"
$json.evidencePackageHooks | ConvertTo-Json -Depth 100
