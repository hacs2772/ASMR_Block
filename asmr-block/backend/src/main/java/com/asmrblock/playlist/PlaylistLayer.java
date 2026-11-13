package com.asmrblock.playlist;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaylistLayer {

    private Long id;
    private Long playlistId;
    private LayerRole role;
    private Double volume;           // 0.0 ~ 1.0
    @Builder.Default
    private List<PlaylistBlock> blocks = new ArrayList<>();

    /** 트랙 길이(초). 메인: 블록 길이 x 반복의 합 / 믹스: 마지막 블록이 끝나는 시각 */
    public int duration() {
        if (role == LayerRole.MIX) {
            return blocks.stream().mapToInt(PlaylistBlock::endSeconds).max().orElse(0);
        }
        return blocks.stream().mapToInt(PlaylistBlock::totalSeconds).sum();
    }
}
