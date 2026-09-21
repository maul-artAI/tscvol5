@echo off
rem ============================================================
rem  TSC-App (Inertia) - Nyalakan semua service
rem  - MariaDB :3306 (bila belum jalan)
rem  - Laravel + React :8000 (0.0.0.0 agar bisa dibuka device lain)
rem  - APP_URL otomatis ikut IP WiFi saat ini
rem ============================================================
setlocal
cd /d "%~dp0"

for /f %%i in ('powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(192\.168\.|172\.20\.|10\.)' } | Select-Object -First 1).IPAddress"') do set LANIP=%%i
if "%LANIP%"=="" set LANIP=127.0.0.1
echo IP: %LANIP%

powershell -NoProfile -Command "(Get-Content .env) -replace '^APP_URL=.*', 'APP_URL=http://%LANIP%:8000' | Set-Content .env"

echo === 1/2 MariaDB ===
powershell -NoProfile -Command "if (Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 3306 }) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel%==0 (
  echo   Sudah jalan.
) else (
  echo   Menyalakan MariaDB...
  start "TSC MariaDB" /min "C:\Program Files\FlyEnv-Data\app\mariadb-13.0.1\bin\mariadbd.exe" --defaults-file="C:\Program Files\FlyEnv-Data\server\mariadb\my-13.0.cnf" --console
  timeout /t 10 /nobreak >nul
)

echo === 2/2 Aplikasi (port 8000) ===
powershell -NoProfile -Command "if (Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq 8000 }) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel%==0 (
  echo   Sudah jalan.
) else (
  start "TSC App" /min "C:\Program Files\FlyEnv-Data\app\php-8.4.25\php.exe" artisan serve --host=0.0.0.0 --port=8000
  timeout /t 8 /nobreak >nul
)

echo.
curl.exe -s -o NUL -w "  Landing : http://%LANIP%:8000/ ............. [%%{http_code}]" http://%LANIP%:8000/
echo.
curl.exe -s -o NUL -w "  Admin   : http://%LANIP%:8000/admin ........ [%%{http_code}]" http://%LANIP%:8000/admin
echo.
echo.
echo Login admin: admin@tsc.local / admin123 (SEGERA GANTI)
pause
