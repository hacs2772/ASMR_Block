package com.asmrblock.domain;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Playlist {
    
    private Long id;
    private Long userId;
    private String title;
    private String description;
    private Integer totalDuration;   // 총 재생 시간 (초)
    private Boolean isPublic;
    private Integer playCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // 조인 데이터
    private User user;
    private List<PlaylistBlock> blocks;
}
