@echo off
echo ============================================
echo Testing Aithor Backend Endpoints
echo ============================================
echo.

echo [1] Testing Root Endpoint...
curl -s http://localhost:5000/
echo.
echo.

echo [2] Testing /api/company (should return 401 without token)...
curl -s http://localhost:5000/api/company
echo.
echo.

echo [3] Testing /api/ai (should return 401 without token)...
curl -s http://localhost:5000/api/ai
echo.
echo.

echo ============================================
echo Test Complete!
echo ============================================
echo.
echo If you see "AiThor API is running" above, backend is working!
echo If you see 401 errors, routes are registered correctly!
echo If you see 404 errors, routes are NOT registered!
echo.
pause
