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
public class PlaylistBlock {
    
    private Long id;
    private Long playlistId;
    private Long blockId;
    private Integer sortOrder;
    private LocalDateTime createdAt;
    
    // 조인 데이터
    private Block block;
}
