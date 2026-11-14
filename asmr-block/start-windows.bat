@echo off
chcp 65001 >nul
title ASMR Block 켜기
cd /d "%~dp0"

rem =====================================================
rem  ASMR Block 한 번에 켜기 (윈도우)
rem  이 파일을 더블클릭하면:
rem   1) 최신 코드를 받고
rem   2) Docker Desktop이 켜져 있는지 확인한 뒤
rem   3) 서버 창과 앱(QR 코드) 창을 따로 열어요
rem  끌 때는 두 창에서 Ctrl+C 를 누르거나 창을 닫으면 돼요.
rem =====================================================

echo.
echo  [1/3] 최신 코드 받는 중...
git pull
echo.

echo  [2/3] Docker 확인 중...
docker info >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Docker Desktop이 아직 꺼져 있어요.
  echo  Docker Desktop을 켜고 "Engine running"이 보이면 아무 키나 누르세요.
  pause >nul
)

echo  [3/3] 서버 창과 앱 창을 여는 중...
start "ASMR Block 서버 - 끄려면 Ctrl+C" cmd /k "docker compose up --build"
start "ASMR Block 앱 - QR 코드" cmd /k "cd mobile && npm.cmd install && npx.cmd expo start"

echo.
echo  창 두 개가 열렸어요.
echo   - 서버 창: Started AsmrBlockApplication 이 보이면 준비 끝
echo   - 앱 창: QR 코드를 아이폰 카메라로 찍거나, Expo Go의 최근 프로젝트를 누르세요
echo.
pause
