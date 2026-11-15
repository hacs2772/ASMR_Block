@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ASMR Block 공개 서버를 끕니다 (DB와 올린 음원은 그대로 남아요)
docker compose -f docker-compose.public.yml --env-file .env.public down
pause
