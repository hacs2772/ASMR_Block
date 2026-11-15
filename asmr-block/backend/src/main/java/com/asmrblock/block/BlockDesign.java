package com.asmrblock.block;

import com.asmrblock.common.ApiException;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * 블록 꾸미기 규칙: 사진이 있으면 사진, 없으면 스티커(최대 3개) + 무늬, 둘 다 없으면 트리거 아이콘.
 * 스티커 그림은 앱(mobile/src/lib/stickers.ts)과 웹(frontend/src/lib/stickers.js)에 같은 코드로 들어 있음.
 * 스티커를 추가하면 세 곳을 같이 고칠 것.
 */
public final class BlockDesign {

    private BlockDesign() {
    }

    public static final List<String> STICKERS = List.of(
            "flagjp", "flagkr", "signal", "train", "bird", "tree", "mountain", "rain",
            "wave", "fire", "moon", "wax", "soap", "keyboard", "brush", "mic");
    public static final List<String> PATTERNS = List.of("dots", "lines", "none");
    public static final int MAX_STICKERS = 3;

    /** "flagjp, signal,bird" → 검사 후 "flagjp,signal,bird" (비어 있으면 null) */
    public static String normalizeStickers(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        List<String> codes = Arrays.stream(raw.split(","))
                .map(s -> s.trim().toLowerCase(Locale.ROOT)).filter(s -> !s.isEmpty()).distinct().toList();
        if (codes.size() > MAX_STICKERS) {
            throw ApiException.badRequest("스티커는 최대 %d개까지 붙일 수 있어요.".formatted(MAX_STICKERS));
        }
        codes.stream().filter(c -> !STICKERS.contains(c)).findFirst().ifPresent(c -> {
            throw ApiException.badRequest("없는 스티커예요: " + c);
        });
        return codes.isEmpty() ? null : String.join(",", codes);
    }

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
