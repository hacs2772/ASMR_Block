@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ASMR Block 공개 서버

echo.
echo  ===========================================
echo   ASMR Block 공개 서버 켜기 (asmrblock.com)
echo  ===========================================
echo.

echo [1/4] 최신 코드 받기 (git pull)
git pull

echo.
echo [2/4] Docker 확인
docker info >nul 2>&1
if errorlevel 1 (
    echo   Docker Desktop 이 꺼져 있어요. 켜고 고래 아이콘이 멈추면 이 파일을 다시 실행해 주세요.
    pause
    exit /b 1
)

echo.
echo [3/4] 설정 파일 확인 (.env.public)
if not exist ".env.public" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\new-env-public.ps1"
)
findstr /c:"=CHANGE_ME" ".env.public" >nul
if not errorlevel 1 (
    echo.
    echo   메모장이 열리면 CHANGE_ME 세 곳을 바꾸고 저장해 주세요:
    echo     TUNNEL_TOKEN   = Cloudflare 터널 토큰
    echo     ADMIN_EMAIL    = 관리자 이메일
    echo     ADMIN_PASSWORD = 관리자 비밀번호 - 10자 이상, 나만 아는 것
    rem  ⚠ 이 if 괄호 묶음 안의 echo에는 괄호를 쓰지 않음 - 괄호가 묶음을 일찍 끝내 버림
    echo   저장한 뒤 이 파일을 다시 실행하면 돼요.
    notepad ".env.public"
    pause
    exit /b 1
)

echo.
echo [4/4] 공개 서버 켜기 - 서버가 다 준비될 때까지 기다려요. 처음이나 업데이트 뒤엔 5~10분
docker compose -f docker-compose.public.yml --env-file .env.public up -d --build --wait --wait-timeout 900
if errorlevel 1 (
    echo.
    echo   서버가 제대로 켜지지 않았어요. 아래 줄을 PowerShell에 붙여 넣으면 원인 글이 보여요:
    echo   docker compose -f docker-compose.public.yml --env-file .env.public logs --tail 60 backend
    pause
    exit /b 1
)

echo.
echo  켜졌어요!  https://asmrblock.com
echo  (내 PC 확인용: http://localhost:8088)
echo.
echo  이 창은 닫아도 서버는 계속 켜져 있어요.
echo  PC를 다시 켜면 Docker Desktop 이 켜질 때 저절로 다시 켜져요.
echo  끄려면: stop-public.bat
echo.
pause
