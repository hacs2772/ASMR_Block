package com.asmrblock.sticker;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** 블록 겉면 스티커 (V8). 그림은 SVG 글자(svg) 또는 PNG 파일(imageKey) */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Sticker {

    private String code;
    private String name;
    private String nameEn;           // 영어 이름 (V15, 비면 name)
    private String svg;
    private String imageKey;
    private Integer sortOrder;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
