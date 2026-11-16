package com.asmrblock.report;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** 관리자 신고 목록 한 줄 (대상별로 묶은 것, MyBatis 결과) */
@Getter
@Setter
public class ReportTarget {
    private String targetType;
    private Long targetId;
    private String title;
    private Long ownerId;
    private String ownerNickname;
    private String state;
    private long count;
    private long copyright;
    private long offensive;
    private long spam;
    private long other;
    private String details;
    /** 블록이면 음원 키 (관리자가 들어 보기) */
    private String mediaKey;
    private LocalDateTime firstAt;
    private LocalDateTime lastAt;
}
