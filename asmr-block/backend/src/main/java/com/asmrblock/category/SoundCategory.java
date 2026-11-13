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
    private String color;
    private String icon;
    private Long parentId;           // null이면 대분류
    private String description;

    // 조인 데이터 (소분류일 때 대분류 이름)
    private String parentName;
    private Integer sortOrder;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
