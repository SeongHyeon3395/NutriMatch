Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRef = 'wrgeaabfsbjdgtjcwevv'

$imgPath = Join-Path $PSScriptRoot '..\supabase\prompts\gemini_image_prompt.txt'
$asstPath = Join-Path $PSScriptRoot '..\supabase\prompts\gemini_assistant_prompt.txt'

$img = Get-Content -Raw $imgPath
$asst = Get-Content -Raw $asstPath

$imgB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($img))
$asstB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($asst))

Write-Host "Setting Supabase secrets on project $projectRef..." -ForegroundColor Cyan

npx supabase secrets set GEMINI_IMAGE_PROMPT_B64="$imgB64" GEMINI_ASSISTANT_PROMPT_B64="$asstB64" --project-ref $projectRef

Write-Host "Done. Deploy functions to apply." -ForegroundColor Green
Write-Host "npx supabase functions deploy analyze-food-image --project-ref $projectRef" -ForegroundColor Yellow
