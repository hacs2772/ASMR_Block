package com.asmrblock.storage;

import com.asmrblock.config.AppProperties;
import com.asmrblock.support.FakeS3Server;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** 클라우드 저장소 (S3 호환, 테스트는 JVM 안의 작은 가짜 S3 서버로) */
class S3StorageServiceTest {

    @TempDir
    Path dir;
    private FakeS3Server s3;

    @BeforeEach
    void start() throws IOException {
        s3 = new FakeS3Server("asmr-test");
    }

    @AfterEach
    void stop() {
        s3.close();
    }

    private AppProperties properties(String bucket) {
        return new AppProperties(
                new AppProperties.Jwt("x".repeat(32), Duration.ofMinutes(30)),
                new AppProperties.Auth(Duration.ofDays(14)),
                new AppProperties.Storage(dir.resolve("legacy").toString(), "http://localhost:8080/files", "s3",
                        new AppProperties.Storage.S3(s3.endpoint(), "auto", bucket, "test-key", "test-secret",
                                s3.publicUrl() + "/", dir.resolve("cache").toString(), 3)),
                new AppProperties.Cors(List.of()),
                new AppProperties.PlayCount(Duration.ofMinutes(30)),
                new AppProperties.Audio("ffmpeg", "ffprobe", -24, Duration.ofMinutes(1)),
                new AppProperties.Render(1, 1.5, 3),
                new AppProperties.Shop(100),
                new AppProperties.Coins(70, 100, 100000),
                new AppProperties.Beta(true, 6),
                new AppProperties.Admin(null, null),
                new AppProperties.Upload(200),
                new AppProperties.Site(null),
                new AppProperties.Limits(100, 100, 100, 100, 100, 100, 100),
                new AppProperties.Cleanup(30, "0 40 4 * * *"),
                new AppProperties.Ai("", "claude-haiku-5-5", "low", "", java.time.Duration.ofSeconds(20), 10, 1000, 30, 0.1, 0.5, 1400));
    }

    private Path temp(String name, String text) throws IOException {
        Path p = dir.resolve("tmp").resolve(name);
        Files.createDirectories(p.getParent());
        return Files.writeString(p, text);
    }

    @Test
    @DisplayName("올리기: 버킷에 (소리 종류·캐시 머리말과 함께), 주소는 버킷 공개 주소. 블록 소리는 ffmpeg용으로 받아 두고, 완성본은 임시 파일만 지움")
    void storeAndUrls() throws IOException {
        S3StorageService storage = new S3StorageService(properties("asmr-test"));
        Path block = temp("a.mp3", "block-sound");
        storage.store("blocks/a.mp3", block);

        assertThat(s3.objects().get("blocks/a.mp3").data()).isEqualTo("block-sound".getBytes(StandardCharsets.UTF_8));
        assertThat(s3.objects().get("blocks/a.mp3").contentType()).isEqualTo("audio/mpeg");
        assertThat(s3.objects().get("blocks/a.mp3").cacheControl()).contains("max-age");
        assertThat(storage.publicUrl("blocks/a.mp3")).isEqualTo(s3.publicUrl() + "/blocks/a.mp3");
        assertThat(storage.publicUrl("https://example.com/x.mp3")).isEqualTo("https://example.com/x.mp3");
        assertThat(storage.publicUrl(null)).isNull();
        assertThat(Files.exists(block)).isFalse();
        assertThat(storage.resolve("blocks/a.mp3")).isEqualTo(dir.resolve("cache/blocks/a.mp3").toAbsolutePath().normalize())
                .hasContent("block-sound");

        Path render = temp("r.mp3", "render");
        storage.store("renders/r.mp3", render);
        assertThat(Files.exists(render)).isFalse();
        assertThat(Files.exists(dir.resolve("cache/renders/r.mp3"))).isFalse();
        assertThat(storage.exists("renders/r.mp3")).isTrue();
        assertThat(s3.objects().get("renders/r.mp3").contentType()).isEqualTo("audio/mpeg");

        Path cover = temp("c.jpg", "jpg");
        storage.store("covers/c.jpg", cover);
        assertThat(s3.objects().get("covers/c.jpg").contentType()).isEqualTo("image/jpeg");
    }

    @Test
    @DisplayName("ffmpeg가 읽을 때 받아 둔 게 없으면 클라우드에서 받음, 없는 파일은 exists=false, 지우면 버킷·받아 둔 것 모두")
    void resolveExistsDelete() throws IOException {
        S3StorageService storage = new S3StorageService(properties("asmr-test"));
        storage.store("samples/rain.mp3", temp("rain.mp3", "rain-sound"));
        Files.delete(dir.resolve("cache/samples/rain.mp3"));

        Path read = storage.resolve("samples/rain.mp3");
        assertThat(read).hasContent("rain-sound");
        assertThat(storage.exists("samples/nothing.mp3")).isFalse();
        assertThat(Files.exists(storage.resolve("samples/nothing.mp3"))).isFalse();

        assertThat(storage.delete("samples/rain.mp3")).isEqualTo("rain-sound".length());
        assertThat(s3.objects()).doesNotContainKey("samples/rain.mp3");
        assertThat(Files.exists(read)).isFalse();
        assertThat(storage.exists("samples/rain.mp3")).isFalse();
        assertThat(storage.delete("samples/rain.mp3")).isZero();

        assertThatThrownBy(() -> storage.resolve("../escape.mp3")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.store("../escape.mp3", temp("e.mp3", "x"))).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("옛 파일(local-dir): 옮기기 전엔 옛 주소(/files)로 재생·읽기 → 옮기면 클라우드 주소, 숨김 파일은 빼고, 이미 같은 크기로 있으면 건너뜀")
    void migrateLegacyFiles() throws IOException {
        Path legacy = dir.resolve("legacy");
        Files.createDirectories(legacy.resolve("blocks"));
        Files.createDirectories(legacy.resolve("renders"));
        Files.writeString(legacy.resolve("blocks/old.mp3"), "old-block");
        Files.writeString(legacy.resolve("renders/old.mp3"), "old-render");
        Files.writeString(legacy.resolve(".DS_Store"), "hidden");
        // 지난번에 옮겨 둔 파일(같은 크기)은 다시 올리지 않음
        s3.objects().put("renders/old.mp3", new FakeS3Server.StoredObject("old-render".getBytes(StandardCharsets.UTF_8), "keep/me", null));

        S3StorageService storage = new S3StorageService(properties("asmr-test"));
        assertThat(storage.info()).isEqualTo(new StorageInfo("s3", "asmr-test", 2, 0, 0, 2, false));
        assertThat(storage.publicUrl("blocks/old.mp3")).isEqualTo("http://localhost:8080/files/blocks/old.mp3");
        assertThat(storage.exists("blocks/old.mp3")).isTrue();
        assertThat(storage.resolve("blocks/old.mp3")).hasContent("old-block");

        assertThat(storage.migrateNow()).isZero();
        assertThat(storage.info()).isEqualTo(new StorageInfo("s3", "asmr-test", 2, 2, 0, 0, false));
        assertThat(s3.objects().get("blocks/old.mp3").data()).isEqualTo("old-block".getBytes(StandardCharsets.UTF_8));
        assertThat(s3.objects().get("renders/old.mp3").contentType()).isEqualTo("keep/me");
        assertThat(s3.objects()).doesNotContainKey(".DS_Store");
        assertThat(storage.publicUrl("blocks/old.mp3")).isEqualTo(s3.publicUrl() + "/blocks/old.mp3");
        // 옛 파일은 지우지 않음 (백업처럼 남음)
        assertThat(legacy.resolve("blocks/old.mp3")).exists();
    }

    @Test
    @DisplayName("받아 둔 파일은 며칠(cache-keep-days) 안 쓰면 정리, 쓰면 날짜가 새로워짐")
    void cleanCache() throws IOException {
        S3StorageService storage = new S3StorageService(properties("asmr-test"));
        storage.store("blocks/a.mp3", temp("a.mp3", "a"));
        storage.store("blocks/b.mp3", temp("b.mp3", "b"));
        FileTime old = FileTime.from(Instant.now().minus(Duration.ofDays(5)));
        Files.setLastModifiedTime(dir.resolve("cache/blocks/a.mp3"), old);
        Files.setLastModifiedTime(dir.resolve("cache/blocks/b.mp3"), old);
        storage.resolve("blocks/b.mp3"); // 썼음

        assertThat(storage.cleanCache()).isEqualTo(1);
        assertThat(dir.resolve("cache/blocks/a.mp3")).doesNotExist();
        assertThat(dir.resolve("cache/blocks/b.mp3")).exists();
        // 지워진 것도 다시 읽으면 클라우드에서 받음
        assertThat(storage.resolve("blocks/a.mp3")).hasContent("a");
    }

    @Test
    @DisplayName("설정이 비어 있으면 켜질 때 바로 멈추고 어떤 값이 빠졌는지 알려 줌, 파일 종류 이름")
    void requiredSettingsAndTypes() {
        assertThatThrownBy(() -> new S3StorageService(properties("")))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("APP_STORAGE_S3_BUCKET");
        assertThat(S3StorageService.contentType("videos/a.MP4")).isEqualTo("video/mp4");
        assertThat(S3StorageService.contentType("stickers/s.png")).isEqualTo("image/png");
        assertThat(S3StorageService.contentType("masters/a.flac")).isEqualTo("audio/flac");
        assertThat(S3StorageService.contentType("x.bin")).isEqualTo("application/octet-stream");
    }
}
