package com.asmrblock.audio;

import java.nio.file.Path;
import java.util.List;

/**
 * 믹싱 계획: 메인 트랙 + (선택) 믹스 트랙.
 * 메인 트랙은 조각을 순서대로 이어 붙이고, 믹스 트랙은 조각마다 지정한 시각에 겹쳐 넣습니다.
 */
public record MixPlan(Layer main, Layer mix, Path output) {

    /** 레고 한 조각: file을 repeat번 연속 재생. start는 믹스 트랙에서의 시작 시각(초), 메인은 null */
    public record Clip(Path file, int durationSeconds, int repeat, Integer start) {
        public Clip {
            if (repeat < 1) {
                throw new IllegalArgumentException("반복은 1 이상이어야 합니다.");
            }
        }
    }

    public record Layer(List<Clip> clips, double volume) {
        public Layer {
            if (clips == null || clips.isEmpty()) {
                throw new IllegalArgumentException("트랙에 블록이 없습니다.");
            }
            clips = List.copyOf(clips);
        }
    }
}
