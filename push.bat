@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   PUSH RESUME  -  publish to GitHub
echo ============================================
echo.

REM Safety guard: make sure index.html is the LOCKED (encrypted) version.
findstr /c:"id=\"payload\"" index.html >nul 2>&1
if errorlevel 1 (
  echo WARNING: index.html does NOT look locked ^(no encrypted payload found^).
  echo Pushing now would publish your resume WITHOUT a password.
  echo.
  set /p GO=Type YES to push anyway, or just press Enter to cancel:
  if /i not "%GO%"=="YES" (
    echo Cancelled. Run lock-resume.bat first, then push again.
    echo.
    pause
    exit /b 1
  )
)

echo Staging changes...
git add -A

REM Block Cursor branding in commit messages (hooks/commit-msg).
set "GIT_HOOKS=%~dp0hooks"
if exist "%GIT_HOOKS%\commit-msg" (
  git -c core.hooksPath="%GIT_HOOKS%" diff --cached --quiet
  if errorlevel 1 (
    git -c core.hooksPath="%GIT_HOOKS%" commit -m "Update résumé"
  ) else (
    echo No changes to commit.
  )
) else (
  git diff --cached --quiet
  if errorlevel 1 (
    git commit -m "Update résumé"
  ) else (
    echo No changes to commit.
  )
)

echo.
echo Pushing to GitHub...
git push
if errorlevel 1 (
  echo.
  echo Push failed. Check the message above ^(login, network, or branch^).
  echo.
  pause
  exit /b 1
)

echo.
echo Done. Published to GitHub. Live in a minute at:
echo    https://resume.kdrcoding.com/
echo.
pause
endlocal
