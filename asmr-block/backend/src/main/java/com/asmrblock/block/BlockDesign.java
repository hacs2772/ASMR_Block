package com.asmrblock.block;

import com.asmrblock.common.ApiException;

import java.util.List;
import java.util.Locale;

/**
 * 블록 꾸미기 규칙: 사진이 있으면 사진, 없으면 스티커(최대 3개) + 무늬, 둘 다 없으면 트리거 아이콘.
 * 스티커 목록·그림은 V8부터 DB(sticker 테이블, StickerService)에 있고 관리자 페이지에서 추가함.
 */
public final class BlockDesign {

    private BlockDesign() {
    }

    public static final List<String> PATTERNS = List.of("dots", "lines", "none");
    public static final int MAX_STICKERS = 3;

    public static String normalizePattern(String raw) {
        if (raw == null || raw.isBlank()) {
            return "dots";
        }
        String pattern = raw.trim().toLowerCase(Locale.ROOT);
        if (!PATTERNS.contains(pattern)) {
            throw ApiException.badRequest("무늬는 dots, lines, none 중에서 골라 주세요.");
        }
        return pattern;
    }

    public static List<String> stickerList(String stored) {
        return stored == null || stored.isBlank() ? List.of() : List.of(stored.split(","));
    }
}
