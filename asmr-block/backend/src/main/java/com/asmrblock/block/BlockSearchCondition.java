package com.asmrblock.block;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/** 블록 목록 검색 조건 (MyBatis 매퍼에 그대로 전달) */
@Getter
@Builder
public class BlockSearchCondition {

    private Long categoryId;
    private List<Long> tagIds;       // 이 중 하나라도 달린 블록
    private String keyword;          // 제목 검색
    private BlockStatus status;
    private String sort;             // latest | popular
    private int offset;
    private int limit;
}
