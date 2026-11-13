package com.asmrblock.storage;

import com.asmrblock.config.AppProperties;
import org.springframework.stereotype.Service;

/** 개발용: 서버 디스크(app.storage.local-dir)의 파일을 /files/** 로 제공 (WebConfig 참고) */
@Service
public class LocalStorageService implements StorageService {

    private final String baseUrl;

    public LocalStorageService(AppProperties properties) {
        String url = properties.storage().publicBaseUrl();
        this.baseUrl = url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    @Override
    public String publicUrl(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        if (key.startsWith("http://") || key.startsWith("https://")) {
            return key; // 외부 URL이 그대로 들어있는 경우
        }
        return baseUrl + "/" + (key.startsWith("/") ? key.substring(1) : key);
    }
}
