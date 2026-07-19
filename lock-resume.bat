@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   LOCK RESUME  -  encrypt resume-plain.html
echo ============================================
echo.

if not exist "resume-plain.html" (
  echo ERROR: resume-plain.html not found in this folder.
  echo That is the editable plaintext resume. Nothing to lock.
  echo.
  pause
  exit /b 1
)

REM Optional: read password from local .resume-pw file (gitignored).
if not defined RESUME_PW if exist ".resume-pw" (
  set /p RESUME_PW=<.resume-pw
)

REM Prompt if still not set.
if not defined RESUME_PW (
  for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "$p=Read-Host 'Enter resume password' -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p))"`) do set "RESUME_PW=%%p"
)

if "%RESUME_PW%"=="" (
  echo.
  echo No password entered. Aborted.
  echo.
  pause
  exit /b 1
)

echo.
echo Encrypting...
node lock.mjs
set "EXITCODE=%ERRORLEVEL%"
set "RESUME_PW="

echo.
if "%EXITCODE%"=="0" (
  echo Done. index.html is now locked with your password.
  echo Next: run push.bat to publish it to GitHub.
) else (
  echo Something went wrong ^(exit code %EXITCODE%^). index.html was NOT updated safely - check the message above.
)
echo.
pause
endlocal
