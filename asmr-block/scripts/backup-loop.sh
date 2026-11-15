#!/bin/sh
# =====================================================
# 공개용 자동 백업 (docker-compose.public.yml 의 backup 서비스가 실행)
#   - DB: 켜질 때 한 번 + 하루에 한 번 → backups/db/asmrblock-날짜.sql.gz (BACKUP_KEEP_DAYS일 지난 것은 지움)
#   - 올린 파일(소리 원본·서비스용 소리·영상·사진·스티커): 새로 생기거나 바뀐 것만 backups/media 로 복사
#     (완성본·맛보기·샘플 소리는 다시 만들 수 있어서 뺌)
#   - 지금 한 번만: docker compose -f docker-compose.public.yml --env-file .env.public exec backup sh /backup-loop.sh once
# =====================================================
set -u
set -o pipefail 2>/dev/null || true
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
mkdir -p /backups/db /backups/media

backup_once() {
  stamp=$(date +%Y%m%d-%H%M)
  out="/backups/db/asmrblock-$stamp.sql.gz"
  if pg_dump --no-owner --clean --if-exists | gzip > "$out.tmp"; then
    mv "$out.tmp" "$out"
    echo "[backup] $(date '+%F %T') DB 백업: $(basename "$out") ($(du -h "$out" | cut -f1))"
  else
    rm -f "$out.tmp"
    echo "[backup] $(date '+%F %T') DB 백업 실패 - DB가 켜져 있는지 확인해 주세요"
  fi
  for dir in masters blocks videos covers stickers; do
    if [ -d "/media/$dir" ]; then
      mkdir -p "/backups/media/$dir"
      cp -a -u "/media/$dir/." "/backups/media/$dir/"
    fi
  done
  echo "[backup] $(date '+%F %T') 올린 파일 복사 끝"
  find /backups/db -name 'asmrblock-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
}

if [ "${1:-}" = "once" ]; then
  backup_once
  exit 0
fi
while true; do
  backup_once
  sleep 86400
done
