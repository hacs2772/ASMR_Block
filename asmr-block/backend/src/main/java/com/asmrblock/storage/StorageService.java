package com.asmrblock.storage;

/**
 * 파일 저장소. DB에는 파일 "키"(예: samples/rain.mp3)만 저장하고,
 * 실제 접근 URL은 여기서 만듭니다. 그래서 나중에 로컬 → S3/R2 로
 * 옮겨도 DB를 고칠 필요가 없습니다.
 */
public interface StorageService {

    /** 파일 키 → 앱이 재생할 수 있는 URL. 키가 없으면 null. */
    String publicUrl(String key);
}
