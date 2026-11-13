package com.asmrblock.category;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** 블록별 태그를 한 번에 조회할 때 쓰는 결과 행 (blockId + 태그) */
@Getter
@Setter
@NoArgsConstructor
public class BlockTag {

    private Long blockId;
    private Long id;
    private String name;
}
