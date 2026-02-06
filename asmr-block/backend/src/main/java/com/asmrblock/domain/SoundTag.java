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
public class SoundTag {
    
    private Long id;
    private String name;
    private Integer sortOrder;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
