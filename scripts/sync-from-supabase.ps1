# Supabase Sync Script
# Syncs remote Supabase changes to local project

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Supabase Sync" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# 1. Get Project REF from .env
Write-Host "1. Checking Supabase project..." -ForegroundColor Yellow

$envFile = ".env"
$projectRef = $null

if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match 'SUPABASE_URL=https://(\w+)\.supabase\.co') {
        $projectRef = $matches[1]
        Write-Host "  Project REF: $projectRef" -ForegroundColor Green
    }
}

if (-not $projectRef) {
    Write-Host "  Could not find Project REF" -ForegroundColor Red
    $projectRef = Read-Host "  Enter Project REF"
}
Write-Host ""

# 2. Link project
Write-Host "2. Linking Supabase project..." -ForegroundColor Yellow
try {
    $linkResult = npx supabase link --project-ref $projectRef 2>&1
    Write-Host "  Link successful" -ForegroundColor Green
} catch {
    Write-Host "  Already linked or link failed" -ForegroundColor Yellow
}
Write-Host ""

# 3. Pull database schema
Write-Host "3. Pulling database schema..." -ForegroundColor Yellow
Write-Host "  This will create migration files from remote DB" -ForegroundColor Cyan

$migrationsDir = "supabase\migrations"
if (-not (Test-Path $migrationsDir)) {
    New-Item -ItemType Directory -Path $migrationsDir -Force | Out-Null
}

try {
    $pullResult = npx supabase db pull 2>&1
    Write-Host "  Database schema pulled successfully" -ForegroundColor Green
    Write-Host "  Check: supabase/migrations/*.sql" -ForegroundColor DarkGray
} catch {
    Write-Host "  Database pull failed or no changes" -ForegroundColor Yellow
}
Write-Host ""

# 4. Check Storage policies
Write-Host "4. Checking Storage..." -ForegroundColor Yellow
Write-Host "  Storage policies are in SQL migrations" -ForegroundColor Cyan
Write-Host "  Location: supabase/migrations/*.sql" -ForegroundColor White
Write-Host ""

# 5. Check Edge Functions
Write-Host "5. Checking Edge Functions..." -ForegroundColor Yellow
$functionsDir = "supabase\functions"
if (Test-Path $functionsDir) {
    $functions = Get-ChildItem -Path $functionsDir -Directory | Where-Object { $_.Name -ne "_shared" }
    Write-Host "  Local functions:" -ForegroundColor Cyan
    foreach ($func in $functions) {
        Write-Host "    • $($func.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "  No functions directory" -ForegroundColor Yellow
}
Write-Host ""

# 6. Check environment variables
Write-Host "6. Checking environment variables..." -ForegroundColor Yellow
if (Test-Path $envFile) {
    $requiredVars = @("SUPABASE_URL", "SUPABASE_ANON_KEY")
    $content = Get-Content $envFile -Raw
    
    foreach ($var in $requiredVars) {
        if ($content -match "$var=\S+") {
            Write-Host "  $var OK" -ForegroundColor Green
        } else {
            Write-Host "  $var MISSING" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  .env file not found" -ForegroundColor Red
}
Write-Host ""

# 7. Generate TypeScript types (optional)
Write-Host "7. Generate TypeScript types? (y/N)" -ForegroundColor Yellow
$generateTypes = Read-Host "  "

if ($generateTypes -eq "y" -or $generateTypes -eq "Y") {
    Write-Host "  Generating types..." -ForegroundColor Cyan
    
    $typesDir = "src\types"
    if (-not (Test-Path $typesDir)) {
        New-Item -ItemType Directory -Path $typesDir -Force | Out-Null
    }
    
    try {
        npx supabase gen types typescript --linked > src\types\supabase.ts 2>&1
        Write-Host "  Types generated: src\types\supabase.ts" -ForegroundColor Green
    } catch {
        Write-Host "  Type generation failed" -ForegroundColor Yellow
    }
}
Write-Host ""

# 8. Summary
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Sync Complete" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Synced items:" -ForegroundColor Green
Write-Host "  • Project connection" -ForegroundColor White
Write-Host "  • Database schema (migrations)" -ForegroundColor White
Write-Host "  • Environment variables checked" -ForegroundColor White
Write-Host ""

Write-Host "Check these files:" -ForegroundColor Yellow
Write-Host "  • supabase/migrations/*.sql" -ForegroundColor White
Write-Host "  • supabase/functions/" -ForegroundColor White
Write-Host "  • .env" -ForegroundColor White
Write-Host ""

# 9. Git status
Write-Host "9. Git status..." -ForegroundColor Yellow
try {
    $gitStatus = git status --short 2>&1
    if ($gitStatus) {
        Write-Host "  Changed files:" -ForegroundColor Cyan
        Write-Host $gitStatus -ForegroundColor White
        Write-Host ""
        Write-Host "  To commit:" -ForegroundColor Yellow
        Write-Host "    git add ." -ForegroundColor DarkGray
        Write-Host '    git commit -m "Sync Supabase changes"' -ForegroundColor DarkGray
    } else {
        Write-Host "  No changes" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  Not a git repo or git not installed" -ForegroundColor Cyan
}
Write-Host ""

# 10. Next steps
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review new migration files" -ForegroundColor White
Write-Host "  2. Restart Metro: npm start -- --reset-cache" -ForegroundColor White
Write-Host "  3. Test the app" -ForegroundColor White
Write-Host ""

Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  npx supabase db push     - Push local migrations to remote" -ForegroundColor DarkGray
Write-Host "  npx supabase db diff     - Show schema differences" -ForegroundColor DarkGray
Write-Host "  npx supabase functions deploy - Deploy functions" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Done!" -ForegroundColor Green
