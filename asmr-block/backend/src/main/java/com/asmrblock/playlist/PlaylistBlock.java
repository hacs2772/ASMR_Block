package com.asmrblock.playlist;

import com.asmrblock.block.Block;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 동에 쌓인 블록 하나 (같은 블록을 여러 번 쌓을 수 있음) */
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
    private Block block;
}
