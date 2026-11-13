#!/bin/sh
# Docker 컨테이너 시작 스크립트
set -e

# 개발 환경이면 샘플 음원을 먼저 만들어 둠 (이미 있으면 건너뜀)
if [ "${APP_GENERATE_SAMPLE_AUDIO:-false}" = "true" ]; then
  /app/scripts/generate-sample-audio.sh "${APP_STORAGE_LOCAL_DIR:-/data/media}"
fi

exec java ${JAVA_OPTS:-} -jar /app/app.jar
