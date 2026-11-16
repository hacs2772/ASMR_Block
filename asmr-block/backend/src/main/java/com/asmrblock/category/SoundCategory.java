package com.asmrblock.category;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SoundCategory {
    
    private Long id;
    private String name;
    private String nameEn;           // 영어 이름 (V15, 영어 화면에서 — 비면 name)
    private String code;             // tap, tap.tapping … (앱·웹 파형 모양·필터)
    private String color;
    private String icon;
    private Long parentId;           // null이면 대분류
    private String description;
    private String descriptionEn;    // 영어 한 줄 설명 (V15)

    // 조인 데이터 (소분류일 때 대분류 이름)
    private String parentName;
    private String parentNameEn;
    private String parentCode;
    private Integer sortOrder;
    private Boolean isActive;
    private Integer blockCount;      // 관리자 목록: 이 분류에 달린 블록 수
    private LocalDateTime createdAt;
}
