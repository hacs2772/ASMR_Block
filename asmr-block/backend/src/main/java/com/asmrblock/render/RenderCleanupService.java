package com.asmrblock.render;

import com.asmrblock.config.AppProperties;
import com.asmrblock.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 오래된 완성본 정리: 아무도 renderKeepDays일 동안 안 들은 완성본 파일과 오래된 실패 기록을 지움.
 * 다시 들으면 듣기 화면이 "아직 안 만듦"을 보고 저절로 다시 만들어서 사용자는 모름 (조금 기다릴 뿐).
 * 매일 새벽(app.cleanup.cron, 한국 시간) + 관리자 통계의 "오래된 완성본 정리" 버튼
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RenderCleanupService {

    private final RenderMapper renderMapper;
    private final StorageService storageService;
    private final AppProperties properties;

    /** 지운 완성본 수와 비운 크기 */
    public record Result(int deleted, long freedBytes) {
    }

    @Scheduled(cron = "${app.cleanup.cron}", zone = "Asia/Seoul")
    public void scheduled() {
        Result result = run();
        if (result.deleted() > 0) {
            log.info("오래된 완성본 정리: {}개, {}MB", result.deleted(), result.freedBytes() / (1024 * 1024));
        }
        // 클라우드 저장소면: ffmpeg용으로 받아 둔 블록 소리 중 며칠 안 쓴 것도 지움
        int cached = storageService.cleanCache();
        if (cached > 0) {
            log.info("받아 둔 클라우드 파일 정리: {}개", cached);
        }
    }

    public Result run() {
        List<AudioRender> stale = renderMapper.findStale(properties.cleanup().renderKeepDays());
        long freed = 0;
        int deleted = 0;
        for (AudioRender render : stale) {
            try {
                if (render.getFileKey() != null) {
                    freed += storageService.delete(render.getFileKey());
                }
                renderMapper.deleteById(render.getId());
                deleted++;
            } catch (RuntimeException e) {
                log.warn("완성본 정리 실패 ({}): {}", render.getCompositionHash(), e.getMessage());
            }
        }
        return new Result(deleted, freed);
    }
}
