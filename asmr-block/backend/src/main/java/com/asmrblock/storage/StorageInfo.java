package com.asmrblock.storage;

/**
 * 파일 저장소 상태 (관리자 통계). type = local · s3, bucket = 클라우드 버킷 이름,
 * 옛 파일 옮기기: total = 옮길 옛 파일 수, done = 옮김(이미 있던 것 포함), failed = 실패, pending = 아직 안 옮김, running = 옮기는 중
 */
public record StorageInfo(String type, String bucket, int total, int done, int failed, int pending, boolean running) {

    public static StorageInfo local() {
        return new StorageInfo("local", null, 0, 0, 0, 0, false);
    }
}
