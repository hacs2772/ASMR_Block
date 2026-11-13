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
public class Block {
    
    private Long id;
    private String title;
    private String description;
    private String fileKey;          // 저장소 안의 파일 경로 (예: samples/rain.mp3)
    private String thumbnailKey;
    private Integer duration;        // 재생 시간 (초)
    private Integer price;           // 가격 (0이면 무료)
    private Long categoryId;
    private Long uploaderId;
    private String license;          // CC0, CC-BY, OWN, CREATOR
    private String sourceUrl;
    private String attribution;
    private Integer playCount;
    private String status;           // PENDING, APPROVED, REJECTED
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // 조인 데이터
    private SoundCategory category;
    private User uploader;
    private List<SoundTag> tags;
}
