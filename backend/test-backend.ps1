# PowerShell script to test backend endpoints

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Testing Aithor Backend on Port 5000" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Root endpoint
Write-Host "[1] Testing Root Endpoint (http://localhost:5000/)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/" -Method GET -TimeoutSec 5
    Write-Host "✅ SUCCESS: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: /api/company
Write-Host "[2] Testing /api/company (should return 401 Unauthorized)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/company" -Method GET -TimeoutSec 5
    Write-Host "✅ Response: $($response.StatusCode)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Correct! Got 401 - Route exists and requires auth" -ForegroundColor Green
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "❌ ERROR: Got 404 - Route NOT registered!" -ForegroundColor Red
    } else {
        Write-Host "⚠️  Got: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 3: /api/ai
Write-Host "[3] Testing /api/ai (should return 401 Unauthorized)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/ai" -Method GET -TimeoutSec 5
    Write-Host "✅ Response: $($response.StatusCode)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Correct! Got 401 - Route exists and requires auth" -ForegroundColor Green
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "❌ ERROR: Got 404 - Route NOT registered!" -ForegroundColor Red
    } else {
        Write-Host "⚠️  Got: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 4: /api/ai/extracted-knowledge
Write-Host "[4] Testing /api/ai/extracted-knowledge..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/ai/extracted-knowledge" -Method GET -TimeoutSec 5
    Write-Host "✅ Response: $($response.StatusCode)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Correct! Got 401 - Route exists and requires auth" -ForegroundColor Green
    } elseif ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "❌ ERROR: Got 404 - Route NOT registered!" -ForegroundColor Red
    } else {
        Write-Host "⚠️  Got: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "- If you see '401' errors = Routes are working! ✅" -ForegroundColor Yellow
Write-Host "- If you see '404' errors = Routes NOT registered! ❌" -ForegroundColor Yellow
Write-Host "- Backend should be running on port 5000" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
