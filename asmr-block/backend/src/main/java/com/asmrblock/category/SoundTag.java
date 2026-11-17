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
public class SoundTag {
    
    private Long id;
    /** soft·crispy 같은 코드 (V22, 관리자가 추가하면 t + id) */
    private String code;
    private String name;
    /** 영어 이름 (V22, 비면 name) */
    private String nameEn;
    private Integer sortOrder;
    private Boolean isActive;
    private LocalDateTime createdAt;
    /** 관리자 목록에서만: 이 태그가 달린 블록 수 (지운 블록 제외) */
    private Integer blockCount;
}
