package com.asmrblock.block;

import lombok.Getter;
import lombok.Setter;

/** 내가 올린 블록 하나의 숫자 (올린 사람 본인은 빼고) */
@Getter
@Setter
public class UploadNumbers {
    private Long blockId;
    /** 담은 사람 */
    private long collected;
    /** 최근 7일에 새로 담은 사람 */
    private long newCollects;
    /** 이 블록이 들어간 남의 조합 */
    private long usedInCombos;

    public static UploadNumbers none(Long blockId) {
        UploadNumbers n = new UploadNumbers();
        n.setBlockId(blockId);
        return n;
    }
}
