package com.asmrblock.storage;

import com.asmrblock.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.S3Object;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

/**
 * 클라우드 저장소 (Cloudflare R2 같은 S3 호환, app.storage.type=s3).
 * <ul>
 *   <li>파일은 버킷에, 주소는 버킷의 공개 주소(app.storage.s3.public-base-url) + 키 — 앱·웹이 클라우드에서 바로 받음</li>
 *   <li>ffmpeg가 읽어야 하는 블록 소리(blocks/·samples/)는 cache-dir에 받아 두고 씀, 며칠 안 쓰면 지움</li>
 *   <li>옛 파일(local-dir): 켜질 때 저절로 클라우드로 옮김. 다 옮기기 전까지 그 파일은 옛 주소(/files)로 재생돼서 끊기지 않음</li>
 * </ul>
 */
@Slf4j
@Service
@ConditionalOnProperty(prefix = "app.storage", name = "type", havingValue = "s3")
public class S3StorageService implements StorageService {

    /** 서버(ffmpeg)가 다시 읽는 파일만 받아 둠 — 완성본·사진·영상은 앱·웹이 클라우드에서 바로 받음 */
    private static final List<String> CACHED_PREFIXES = List.of("blocks/", "samples/");
    /** 있다고 확인한 파일은 10분 동안 다시 묻지 않음 (완성본 상태를 1.5초마다 물어봐서) */
    private static final long KNOWN_TTL_MS = Duration.ofMinutes(10).toMillis();
    private static final String CACHE_CONTROL = "public, max-age=604800";

    private final S3Client s3;
    private final String bucket;
    private final String publicBase;
    private final Path cacheRoot;
    private final int cacheKeepDays;
    /** 옛 파일 (local-dir): 옮기기 전까지 읽기·주소에 씀 */
    private final LocalStorageService legacy;
    private final Path legacyRoot;
    private final Set<String> pending = ConcurrentHashMap.newKeySet();
    private final Map<String, Long> known = new ConcurrentHashMap<>();
    private final AtomicInteger total = new AtomicInteger();
    private final AtomicInteger done = new AtomicInteger();
    private final AtomicInteger failed = new AtomicInteger();
    private volatile boolean running;

    public S3StorageService(AppProperties properties) {
        AppProperties.Storage.S3 c = properties.storage().s3();
        this.bucket = required(c.bucket(), "APP_STORAGE_S3_BUCKET");
        this.publicBase = trimSlash(required(c.publicBaseUrl(), "APP_STORAGE_S3_PUBLIC_URL"));
        this.s3 = S3Client.builder()
                .endpointOverride(URI.create(required(c.endpoint(), "APP_STORAGE_S3_ENDPOINT")))
                .region(Region.of(c.region()))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(
                        required(c.accessKey(), "APP_STORAGE_S3_ACCESS_KEY"), required(c.secretKey(), "APP_STORAGE_S3_SECRET_KEY"))))
                // R2·MinIO 등 S3 호환 저장소에 맞춤: 주소에 버킷 이름을 경로로, 꼭 필요할 때만 체크섬, 나눠 보내기 없음
                .serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).chunkedEncodingEnabled(false).build())
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .httpClientBuilder(UrlConnectionHttpClient.builder()
                        .connectionTimeout(Duration.ofSeconds(10))
                        .socketTimeout(Duration.ofMinutes(5)))
                .build();
        this.cacheRoot = Path.of(c.cacheDir()).toAbsolutePath().normalize();
        this.cacheKeepDays = c.cacheKeepDays();
        this.legacy = new LocalStorageService(properties);
        this.legacyRoot = Path.of(properties.storage().localDir()).toAbsolutePath().normalize();
        // 옛 파일 목록은 켜질 때 바로 (옮기기 전에 들어온 요청도 옛 주소로 재생되게)
        List<String> old = legacyKeys();
        pending.addAll(old);
        total.set(old.size());
        log.info("클라우드 저장소 사용: bucket={}, 옮길 옛 파일 {}개", bucket, old.size());
    }

    // ---- StorageService ----

    @Override
    public String publicUrl(String key) {
        if (key == null || key.isBlank()) {
            return null;
        }
        if (key.startsWith("http://") || key.startsWith("https://")) {
            return key;
        }
        String k = strip(key);
        return pending.contains(k) ? legacy.publicUrl(k) : publicBase + "/" + k;
    }

    @Override
    public Path resolve(String key) {
        String k = strip(key);
        if (pending.contains(k) && legacy.exists(k)) {
            return legacy.resolve(k);
        }
        Path cached = cachePath(k);
        if (Files.isRegularFile(cached)) {
            touch(cached);
            return cached;
        }
        try {
            download(k, cached);
        } catch (NoSuchKeyException e) {
            return legacy.exists(k) ? legacy.resolve(k) : cached;
        }
        return cached;
    }

    @Override
    public void store(String key, Path source) {
        String k = strip(key);
        cachePath(k); // 이상한 키(../)는 여기서 막음
        upload(k, source);
        known.put(k, System.currentTimeMillis());
        pending.remove(k);
        try {
            if (CACHED_PREFIXES.stream().anyMatch(k::startsWith)) {
                Path cached = cachePath(k);
                Files.createDirectories(cached.getParent());
                Files.move(source, cached, StandardCopyOption.REPLACE_EXISTING);
            } else {
                Files.deleteIfExists(source);
            }
        } catch (IOException e) {
            log.warn("올린 뒤 임시 파일 정리 실패: {}", k, e);
        }
    }

    @Override
    public boolean exists(String key) {
        String k = strip(key);
        if (pending.contains(k) && legacy.exists(k)) {
            return true;
        }
        Long seen = known.get(k);
        if (seen != null && System.currentTimeMillis() - seen < KNOWN_TTL_MS) {
            return true;
        }
        if (remoteSize(k) < 0) {
            return false;
        }
        known.put(k, System.currentTimeMillis());
        return true;
    }

    @Override
    public long delete(String key) {
        String k = strip(key);
        long remote = remoteSize(k);
        if (remote >= 0) {
            s3.deleteObject(b -> b.bucket(bucket).key(k));
        }
        long size = Math.max(0, remote);
        known.remove(k);
        try {
            Files.deleteIfExists(cachePath(k));
        } catch (IOException e) {
            log.warn("받아 둔 파일 지우기 실패: {}", k, e);
        }
        if (legacy.exists(k)) {
            size = Math.max(size, legacy.delete(k));
        }
        pending.remove(k);
        return size;
    }

    @Override
    public StorageInfo info() {
        return new StorageInfo("s3", bucket, total.get(), done.get(), failed.get(), pending.size(), running);
    }

    @Override
    public int cleanCache() {
        if (!Files.isDirectory(cacheRoot)) {
            return 0;
        }
        FileTime before = FileTime.from(Instant.now().minus(Duration.ofDays(cacheKeepDays)));
        int deleted = 0;
        try (Stream<Path> files = Files.walk(cacheRoot)) {
            for (Path p : files.filter(Files::isRegularFile).toList()) {
                try {
                    if (Files.getLastModifiedTime(p).compareTo(before) < 0 && Files.deleteIfExists(p)) {
                        deleted++;
                    }
                } catch (IOException e) {
                    // 다음에 다시
                }
            }
        } catch (IOException e) {
            log.warn("받아 둔 파일 정리 실패", e);
        }
        return deleted;
    }

    // ---- 옛 파일 옮기기 ----

    /** 켜진 뒤 뒤에서 옛 파일을 클라우드로 옮김 (사람들은 그동안에도 그대로 들음) */
    @EventListener(ApplicationReadyEvent.class)
    public void startMigration() {
        if (pending.isEmpty()) {
            return;
        }
        Thread thread = new Thread(this::migrateNow, "storage-migrate");
        thread.setDaemon(true);
        thread.start();
    }

    /** 옛 파일 옮기기: 클라우드에 같은 크기로 이미 있으면 건너뜀 (다시 켜도 이어서) → 이번에 실패한 수 */
    synchronized int migrateNow() {
        running = true;
        int failedNow = 0;
        try {
            Map<String, Long> remote = remoteSizes();
            for (String key : List.copyOf(pending)) {
                try {
                    Path file = legacy.resolve(key);
                    if (!Files.isRegularFile(file)) {
                        pending.remove(key);
                        continue;
                    }
                    if (!Long.valueOf(Files.size(file)).equals(remote.get(key))) {
                        upload(key, file);
                    }
                    known.put(key, System.currentTimeMillis());
                    pending.remove(key);
                    done.incrementAndGet();
                } catch (RuntimeException | IOException e) {
                    failedNow++;
                    failed.incrementAndGet();
                    log.warn("옛 파일 옮기기 실패: {}", key, e);
                }
            }
            log.info("옛 파일 옮기기 끝: 옮김 {} / {}, 실패 {}", done.get(), total.get(), failedNow);
        } finally {
            running = false;
        }
        return failedNow;
    }

    // ---- 안쪽 ----

    private void upload(String key, Path file) {
        s3.putObject(b -> b.bucket(bucket).key(key).contentType(contentType(key)).cacheControl(CACHE_CONTROL),
                RequestBody.fromFile(file));
    }

    private void download(String key, Path target) {
        try {
            Files.createDirectories(target.getParent());
            Path tmp = Files.createTempFile(target.getParent(), ".dl-", ".part");
            try (ResponseInputStream<GetObjectResponse> in = s3.getObject(b -> b.bucket(bucket).key(key))) {
                Files.copy(in, tmp, StandardCopyOption.REPLACE_EXISTING);
                Files.move(tmp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(tmp);
            }
        } catch (IOException e) {
            throw new UncheckedIOException("클라우드 파일 받기 실패: " + key, e);
        }
    }

    /** 클라우드에 있는 파일 크기 (없으면 -1) */
    private long remoteSize(String key) {
        try {
            return s3.headObject(b -> b.bucket(bucket).key(key)).contentLength();
        } catch (NoSuchKeyException e) {
            return -1;
        } catch (S3Exception e) {
            if (e.statusCode() == 404) {
                return -1;
            }
            throw e;
        }
    }

    /** 버킷의 모든 파일 크기 (옮기기 전에 한 번, 1000개씩) */
    private Map<String, Long> remoteSizes() {
        Map<String, Long> sizes = new HashMap<>();
        for (S3Object o : s3.listObjectsV2Paginator(ListObjectsV2Request.builder().bucket(bucket).build()).contents()) {
            sizes.put(o.key(), o.size());
        }
        return sizes;
    }

    /** local-dir 안의 옛 파일 키 (숨김 파일·폴더 빼고) */
    private List<String> legacyKeys() {
        if (!Files.isDirectory(legacyRoot)) {
            return List.of();
        }
        try (Stream<Path> files = Files.walk(legacyRoot)) {
            return files.filter(Files::isRegularFile)
                    .map(p -> legacyRoot.relativize(p).toString().replace('\\', '/'))
                    .filter(k -> !k.startsWith(".") && !k.contains("/."))
                    .sorted()
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException("옛 파일 목록 읽기 실패: " + legacyRoot, e);
        }
    }

    private Path cachePath(String key) {
        Path path = cacheRoot.resolve(key).normalize();
        if (!path.startsWith(cacheRoot) || path.equals(cacheRoot)) {
            throw new IllegalArgumentException("잘못된 파일 키: " + key);
        }
        return path;
    }

    private static void touch(Path file) {
        try {
            Files.setLastModifiedTime(file, FileTime.from(Instant.now()));
        } catch (IOException e) {
            // 못 바꿔도 괜찮음 (정리 때 조금 일찍 지워질 뿐)
        }
    }

    static String contentType(String key) {
        String ext = key.substring(key.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        return switch (ext) {
            case "mp3" -> "audio/mpeg";
            case "m4a", "aac" -> "audio/mp4";
            case "wav" -> "audio/wav";
            case "ogg", "oga" -> "audio/ogg";
            case "flac" -> "audio/flac";
            case "mp4", "m4v" -> "video/mp4";
            case "mov" -> "video/quicktime";
            case "webm" -> "video/webm";
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            case "svg" -> "image/svg+xml";
            default -> "application/octet-stream";
        };
    }

    private static String strip(String key) {
        return key.startsWith("/") ? key.substring(1) : key;
    }

    private static String trimSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static String required(String value, String env) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("클라우드 저장소(app.storage.type=s3) 설정이 비어 있어요: " + env);
        }
        return value.trim();
    }
}
