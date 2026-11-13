package com.asmrblock.storage;

import com.asmrblock.config.AppProperties;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;

/** 개발용: 서버 디스크(app.storage.local-dir)에 저장하고 /files/** 로 제공 (WebConfig 참고) */
@Service
public class LocalStorageService implements StorageService {

    private final Path root;
    private final String baseUrl;

    public LocalStorageService(AppProperties properties) {
        this.root = Path.of(properties.storage().localDir()).toAbsolutePath().normalize();
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
        return baseUrl + "/" + stripLeadingSlash(key);
    }

    @Override
    public Path resolve(String key) {
        Path path = root.resolve(stripLeadingSlash(key)).normalize();
        if (!path.startsWith(root)) { // ../ 같은 경로 탈출 방지
            throw new IllegalArgumentException("잘못된 파일 키: " + key);
        }
        return path;
    }

    @Override
    public void store(String key, Path source) {
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("파일 저장 실패: " + key, e);
        }
    }

    @Override
    public boolean exists(String key) {
        return Files.isRegularFile(resolve(key));
    }

    private static String stripLeadingSlash(String key) {
        return key.startsWith("/") ? key.substring(1) : key;
    }
}
