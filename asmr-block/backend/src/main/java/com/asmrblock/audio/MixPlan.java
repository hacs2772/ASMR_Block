package com.asmrblock.audio;

import java.nio.file.Path;
import java.util.List;

/**
 * 믹싱 계획: 메인 동 + (선택) 배경 동.
 * 각 동은 블록(트랙)을 순서대로 이어 붙이고, 두 동을 겹쳐서 하나의 파일로 만듭니다.
 */
public record MixPlan(Layer main, Layer background, Path output) {

    public record Track(Path file, int durationSeconds) {
    }

    /** loopToFill: 메인 동보다 짧으면 처음부터 반복해서 끝까지 채움 (배경 동용) */
    public record Layer(List<Track> tracks, double volume, boolean loopToFill) {
        public Layer {
            if (tracks == null || tracks.isEmpty()) {
                throw new IllegalArgumentException("동에 블록이 없습니다.");
            }
            tracks = List.copyOf(tracks);
        }
    }
}
