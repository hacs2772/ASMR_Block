package com.asmrblock.block;

import com.asmrblock.audio.AudioProcessingException;
import com.asmrblock.audio.AudioService;
import com.asmrblock.audio.AudioService.Waveform;
import com.asmrblock.block.BlockDtos.UploadDraftResponse;
import com.asmrblock.common.ApiException;
import com.asmrblock.config.AppProperties;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 올리기 전 "구간 고르기": 소리 파일이나 영상(kind=video)을 먼저 받아 길이와 파형을 돌려줌 → 화면에서 손잡이로 구간을 고르고
 * 올리기(draftId + trimStart/trimEnd)에서 이 파일을 다시 씀 (같은 파일을 두 번 보내지 않게).
 * 임시 폴더에 KEEP 동안만 두고, 한 사람당 MAX_PER_USER개까지 (서버를 다시 켜면 비워짐)
 */
@Slf4j
@Service
public class UploadDraftService {

    static final int PEAK_COUNT = 400;
    private static final Duration KEEP = Duration.ofHours(6);
    private static final int MAX_PER_USER = 3;
    private static final String DIR_PREFIX = "asmrblock-drafts-";

    private final AudioService audioService;
    private final AppProperties properties;
    private final Path dir;
    private final Map<String, Draft> drafts = new ConcurrentHashMap<>();

    /** 받아 둔 파일 (video = 영상: 소리와 화면을 같은 구간으로 자름) */
    record Draft(String id, Long userId, Path file, String extension, boolean video, double duration, Instant createdAt) {
    }

    public UploadDraftService(AudioService audioService, AppProperties properties) {
        this.audioService = audioService;
        this.properties = properties;
        this.dir = createDir();
    }

    /** kind: audio(기본) | video */
    public UploadDraftResponse create(Long userId, MultipartFile file, String kind) {
        boolean video = "video".equalsIgnoreCase(kind);
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest(video ? "영상을 골라 주세요." : "소리 파일을 골라 주세요.");
        }
        String extension = BlockUploadService.extensionOf(file.getOriginalFilename(),
                video ? BlockUploadService.VIDEO_EXTENSIONS : BlockUploadService.ALLOWED_EXTENSIONS);
        if (video) {
            BlockUploadService.checkSize(file, properties.upload().maxVideoMb(), "영상");
        } else {
            BlockUploadService.checkSize(file, BlockUploadService.MAX_FILE_MB, "음원");
        }
        removeExpired();

        String id = UUID.randomUUID().toString();
        Path path = dir.resolve(id + "." + extension);
        Path pcm = dir.resolve(id + ".pcm");
        Waveform waveform;
        try {
            file.transferTo(path);
            waveform = audioService.waveform(path, pcm, PEAK_COUNT);
        } catch (AudioProcessingException e) {
            log.info("구간 고르기 파일 읽기 실패: {}", e.getMessage());
            delete(path);
            throw ApiException.badRequest(video ? "영상에서 소리를 찾지 못했어요. 소리가 있는 영상을 골라 주세요."
                    : "오디오 파일을 읽을 수 없습니다. 다른 파일로 시도해주세요.");
        } catch (IOException e) {
            delete(path);
            throw new UncheckedIOException(e);
        } finally {
            delete(pcm);
        }

        drafts.put(id, new Draft(id, userId, path, extension, video, waveform.durationSeconds(), Instant.now()));
        // 한 사람이 너무 많이 쌓아 두지 않게 오래된 것부터 지움
        drafts.values().stream()
                .filter(d -> d.userId().equals(userId))
                .sorted(Comparator.comparing(Draft::createdAt).reversed())
                .skip(MAX_PER_USER)
                .forEach(this::discard);
        return new UploadDraftResponse(id, video ? "video" : "audio", Math.round(waveform.durationSeconds() * 100) / 100.0,
                waveform.peaks());
    }

    /** 올리기에서 쓸 파일 (내 것만) */
    Draft take(Long userId, String id) {
        Draft draft = id == null ? null : drafts.get(id);
        if (draft == null || !draft.userId().equals(userId) || expired(draft) || !Files.exists(draft.file())) {
            throw ApiException.badRequest("올린 소리 파일을 찾지 못했어요. 파일을 다시 골라 주세요.");
        }
        return draft;
    }

    /** 다 쓴 파일 지우기 */
    void discard(Draft draft) {
        drafts.remove(draft.id());
        delete(draft.file());
    }

    private void removeExpired() {
        drafts.values().stream().filter(UploadDraftService::expired).forEach(this::discard);
    }

    private static boolean expired(Draft draft) {
        return draft.createdAt().plus(KEEP).isBefore(Instant.now());
    }

    @PreDestroy
    void cleanUp() {
        FileSystemUtils.deleteRecursively(dir.toFile());
    }

    /** 이번에 쓸 임시 폴더 (지난번에 서버가 갑자기 꺼져 남은 오래된 폴더는 지움) */
    private static Path createDir() {
        try {
            Path tmp = Path.of(System.getProperty("java.io.tmpdir"));
            try (DirectoryStream<Path> old = Files.newDirectoryStream(tmp, DIR_PREFIX + "*")) {
                Instant limit = Instant.now().minus(KEEP);
                for (Path p : old) {
                    if (Files.getLastModifiedTime(p).toInstant().isBefore(limit)) {
                        FileSystemUtils.deleteRecursively(p);
                    }
                }
            }
            return Files.createTempDirectory(DIR_PREFIX);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static void delete(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("임시 파일을 지우지 못했어요: {}", path);
        }
    }
}
