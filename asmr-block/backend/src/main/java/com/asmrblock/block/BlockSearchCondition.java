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
    private String keyword;          // 이름·녹음한 곳·크리에이터 닉네임 검색
    private TalkType talkType;       // NONE: 노토킹만, WHISPER: 속삭임만
    private Boolean free;            // true: 무료만, false: 유료만, null: 전부
    private BlockStatus status;
    private String sort;             // latest | popular
    private int offset;
    private int limit;
}
