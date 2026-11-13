package com.asmrblock.block;

import lombok.Getter;
import lombok.Setter;

/** 블록 id별 개수 (예: 담은 사람 수) */
@Getter
@Setter
public class BlockCount {
    private Long blockId;
    private long count;
}
