package com.asmrblock.domain;

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
    private Integer sortOrder;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
