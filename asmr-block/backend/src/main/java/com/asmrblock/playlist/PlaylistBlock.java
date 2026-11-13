package com.asmrblock.playlist;

import com.asmrblock.block.Block;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 트랙에 놓인 블록 하나 (레고 한 조각). 같은 블록을 여러 번 놓거나 반복할 수 있음 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaylistBlock {

    private Long id;
    private Long layerId;
    private Long blockId;
    private Integer sortOrder;
    @Builder.Default
    private Integer repeatCount = 1;   // 연속 반복 횟수
    private Integer startSeconds;      // 믹스 트랙에서만 사용 (시작 시각)
    private Block block;

    /** 이 조각의 길이 = 블록 길이 x 반복 */
    public int totalSeconds() {
        return block.getDuration() * repeatCount;
    }

    public int endSeconds() {
        return (startSeconds == null ? 0 : startSeconds) + totalSeconds();
    }
}
