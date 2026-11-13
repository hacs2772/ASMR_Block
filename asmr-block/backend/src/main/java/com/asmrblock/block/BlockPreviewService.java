package com.asmrblock.block;

import com.asmrblock.audio.AudioProcessingException;
import com.asmrblock.audio.AudioService;
import com.asmrblock.config.AsyncConfig;
import com.asmrblock.storage.StorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.util.FileSystemUtils;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * 유료 블록 맛보기 파일(앞 30초). 사기 전에는 이 파일만 들려주고 원본 주소는 숨김.
 * 가격을 정하거나 승인할 때 만들고, 서버가 시작될 때 빠진 것을 채움.
 */
@Slf4j
@Service
public class BlockPreviewService {

    public static final int PREVIEW_SECONDS = 30;

    private final BlockMapper blockMapper;
    private final AudioService audioService;
    private final StorageService storageService;
    private final TaskExecutor executor;

    public BlockPreviewService(BlockMapper blockMapper, AudioService audioService, StorageService storageService,
                               @Qualifier(AsyncConfig.RENDER_EXECUTOR) TaskExecutor executor) {
        this.blockMapper = blockMapper;
        this.audioService = audioService;
        this.storageService = storageService;
        this.executor = executor;
    }

    /** 유료 블록이면 맛보기 파일을 만듦 (이미 있으면 그대로, 원본이 없으면 건너뜀) */
    public void ensurePreview(Block block) {
        if (!block.isPaid()) {
            return;
        }
        if (block.getPreviewKey() != null && storageService.exists(block.getPreviewKey())) {
            return;
        }
        if (!storageService.exists(block.getFileKey())) {
            log.warn("맛보기를 만들 원본이 없음: block={} key={}", block.getId(), block.getFileKey());
            return;
        }
        Path workDir = null;
        try {
            workDir = Files.createTempDirectory("preview-");
            Path output = workDir.resolve("preview.mp3");
            audioService.preview(storageService.resolve(block.getFileKey()), output, PREVIEW_SECONDS);
            String key = "previews/%d-%ds.mp3".formatted(block.getId(), PREVIEW_SECONDS);
            storageService.store(key, output);
            blockMapper.updatePreviewKey(block.getId(), key);
            block.setPreviewKey(key);
        } catch (AudioProcessingException e) {
            log.warn("맛보기 만들기 실패: block={} {}", block.getId(), e.getMessage());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            if (workDir != null) {
                FileSystemUtils.deleteRecursively(workDir.toFile());
            }
        }
    }

    /** 서버 시작 시 맛보기가 빠진 유료 블록 채우기 (개발용 샘플 등). 시작을 늦추지 않도록 백그라운드에서 */
    @EventListener(ApplicationReadyEvent.class)
    public void backfill() {
        executor.execute(() -> blockMapper.findPaidWithoutPreview().forEach(block -> {
            try {
                ensurePreview(block);
            } catch (RuntimeException e) {
                log.warn("맛보기 채우기 실패: block={}", block.getId(), e);
            }
        }));
    }
}
