package com.asmrblock.storage;

import java.nio.file.Path;

/**
 * 파일 저장소. DB에는 파일 "키"(예: samples/rain.mp3)만 저장하고,
 * 실제 접근 URL과 경로는 여기서 만듭니다. 그래서 로컬 → 클라우드(S3/R2)로
 * 옮겨도 DB를 고칠 필요가 없습니다: app.storage.type = local(LocalStorageService) · s3(S3StorageService).
 */
public interface StorageService {

    /** 파일 키 → 앱이 재생할 수 있는 URL. 키가 없으면 null. */
    String publicUrl(String key);

    /** 읽기용 로컬 파일 경로 (ffmpeg 입력 등). */
    Path resolve(String key);

    /** 로컬 파일을 저장소의 key 위치로 옮깁니다. */
    void store(String key, Path source);

    boolean exists(String key);

    /** 파일 지우기. 지운 크기(바이트), 없으면 0 */
    long delete(String key);

    /** 관리자 통계용: 어디에 저장하는지 + 옛 파일 옮기기 상태 */
    default StorageInfo info() {
        return StorageInfo.local();
    }

    /** 클라우드에서 잠깐 받아 둔 파일 중 오래 안 쓴 것 지우기 (매일 새벽 정리 때) → 지운 개수 */
    default int cleanCache() {
        return 0;
    }
}
