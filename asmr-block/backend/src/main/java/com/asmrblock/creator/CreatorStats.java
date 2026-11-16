package com.asmrblock.creator;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** 크리에이터 숫자 (매퍼 결과) */
@Getter
@Setter
public class CreatorStats {
    private Long id;
    private String nickname;
    private LocalDateTime createdAt;
    private long blockCount;
    private long collectorCount;
    private long playCount;
}
