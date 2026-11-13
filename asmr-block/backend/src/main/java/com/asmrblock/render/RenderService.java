package com.asmrblock.render;

import com.asmrblock.audio.AudioService;
import com.asmrblock.audio.MixPlan;
import com.asmrblock.config.AsyncConfig;
import com.asmrblock.playlist.Playlist;
import com.asmrblock.playlist.PlaylistService;
import com.asmrblock.storage.StorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 완성본 만들기.
 * 1) 요청 → 구성 해시로 기존 완성본이 있는지 확인 (있으면 바로 재생 가능)
 * 2) 없으면 대기열에 넣고, 작업 스레드가 ffmpeg로 합쳐서 저장소에 저장
 * 3) 앱은 GET으로 상태를 확인하다가 DONE이 되면 fileUrl 재생
 */
@Slf4j
@Service
public class RenderService {

    private final RenderMapper renderMapper;
    private final PlaylistService playlistService;
    private final AudioService audioService;
    private final StorageService storageService;
    private final TaskExecutor executor;
    private final JsonMapper jsonMapper;

    /** 이 서버에서 이미 대기열에 넣은 작업 (중복 제출 방지) */
    private final Set<String> queued = ConcurrentHashMap.newKeySet();

    public RenderService(RenderMapper renderMapper, PlaylistService playlistService, AudioService audioService,
                         StorageService storageService,
                         @Qualifier(AsyncConfig.RENDER_EXECUTOR) TaskExecutor executor,
                         JsonMapper jsonMapper) {
        this.renderMapper = renderMapper;
        this.playlistService = playlistService;
        this.audioService = audioService;
        this.storageService = storageService;
        this.executor = executor;
        this.jsonMapper = jsonMapper;
    }

    /** 완성본 요청 (이미 있으면 그대로 반환) */
    public RenderResponse request(Long playlistId, Long userId) {
        Composition composition = Composition.of(playlistService.getViewable(playlistId, userId));
        String hash = composition.hash();

        renderMapper.insertIfAbsent(hash, jsonMapper.writeValueAsString(composition));
        AudioRender render = renderMapper.findByHash(hash).orElseThrow();

        boolean fileLost = render.getStatus() == RenderStatus.DONE && !storageService.exists(render.getFileKey());
        if (render.getStatus() == RenderStatus.FAILED || fileLost) {
            renderMapper.resetToPending(hash);
            render.setStatus(RenderStatus.PENDING);
            render.setProgress(0);
        }
        if (render.getStatus() == RenderStatus.PENDING) {
            submit(hash);
        }
        return RenderResponse.from(render, storageService);
    }

    /** 현재 상태 조회 (요청한 적 없으면 NOT_REQUESTED) */
    public RenderResponse status(Long playlistId, Long userId) {
        return statusOf(playlistService.getViewable(playlistId, userId));
    }

    public RenderResponse statusOf(Playlist playlist) {
        String hash;
        try {
            hash = Composition.of(playlist).hash();
        } catch (RuntimeException e) {
            return RenderResponse.NOT_REQUESTED; // 재생 가능한 블록이 없는 경우
        }
        return renderMapper.findByHash(hash)
                .map(render -> RenderResponse.from(render, storageService))
                .orElse(RenderResponse.NOT_REQUESTED);
    }

    /** 서버가 켜질 때 멈춰 있던 작업을 다시 시작 */
    @EventListener(ApplicationReadyEvent.class)
    public void resumePendingRenders() {
        int reset = renderMapper.resetProcessingToPending();
        List<String> pending = renderMapper.findPendingHashes();
        if (reset > 0 || !pending.isEmpty()) {
            log.info("완성본 작업 재개: {}개", pending.size());
        }
        pending.forEach(this::submit);
    }

    private void submit(String hash) {
        if (queued.add(hash)) {
            executor.execute(() -> process(hash));
        }
    }

    void process(String hash) {
        Path workDir = null;
        try {
            if (renderMapper.markProcessing(hash) == 0) {
                return; // 다른 작업자가 처리 중이거나 이미 끝남
            }
            AudioRender render = renderMapper.findByHash(hash).orElseThrow();
            Composition composition = jsonMapper.readValue(render.getCompositionJson(), Composition.class);

            workDir = Files.createTempDirectory("render-");
            Path output = workDir.resolve("mix.mp3");
            long started = System.currentTimeMillis();
            int[] lastProgress = {0};
            int duration = audioService.mix(new MixPlan(
                    toMixLayer(composition.main()),
                    composition.mix() == null ? null : toMixLayer(composition.mix()),
                    output), progress -> {
                // DB에는 2% 단위로만 기록 (너무 자주 쓰지 않도록)
                if (progress >= lastProgress[0] + 2) {
                    lastProgress[0] = progress;
                    renderMapper.updateProgress(hash, progress);
                }
            });

            String fileKey = "renders/" + hash + ".mp3";
            storageService.store(fileKey, output);
            renderMapper.markDone(hash, fileKey, duration);
            log.info("완성본 생성 완료: {} ({}초 분량, {}ms)", hash.substring(0, 12), duration,
                    System.currentTimeMillis() - started);
        } catch (Exception e) {
            log.warn("완성본 생성 실패: {} - {}", hash.substring(0, 12), e.getMessage());
            renderMapper.markFailed(hash, truncate(e.getMessage()));
        } finally {
            queued.remove(hash);
            if (workDir != null) {
                try {
                    FileSystemUtils.deleteRecursively(workDir);
                } catch (IOException ignored) {
                    // 임시 폴더 삭제 실패는 무시
                }
            }
        }
    }

    private MixPlan.Layer toMixLayer(Composition.Layer layer) {
        List<MixPlan.Clip> clips = layer.clips().stream().map(clip -> {
            Path file = storageService.resolve(clip.fileKey());
            if (!Files.isRegularFile(file)) {
                throw new IllegalStateException("음원 파일이 없습니다: " + clip.fileKey());
            }
            return new MixPlan.Clip(file, clip.duration(), clip.repeat(), clip.start());
        }).toList();
        return new MixPlan.Layer(clips, layer.volume());
    }

    private static String truncate(String message) {
        if (message == null) {
            return "알 수 없는 오류";
        }
        return message.length() <= 1000 ? message : message.substring(0, 1000);
    }
}
