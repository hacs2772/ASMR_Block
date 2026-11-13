package com.asmrblock.block;

import com.asmrblock.category.SoundCategory;
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
public class Block {

    private Long id;
    private String title;
    private String description;
    private String fileKey;          // 서비스용 음원 (samples/rain.mp3, blocks/xxx.mp3)
    private String masterFileKey;    // 업로드 원본
    private String thumbnailKey;
    private String previewKey;       // 유료 블록 맛보기(앞 30초) 파일
    private Integer duration;        // 재생 시간 (초)
    private Integer price;           // 가격 (코인, 0이면 무료)
    private TalkType talkType;       // 말소리 (노토킹 / 속삭임 / 말하기)
    private String recordedPlace;    // 녹음한 곳 (선택)
    private Long categoryId;
    private Long uploaderId;
    private License license;
    private String sourceUrl;
    private String attribution;
    private Integer playCount;
    private BlockStatus status;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 조인 데이터
    private SoundCategory category;
    private String uploaderNickname;
    private Integer recentPlays;     // 요즘 뜨는 소리 조회 시 최근 재생 수

    public boolean isPaid() {
        return price != null && price > 0;
    }

    public boolean isPlayable() {
        return status == BlockStatus.APPROVED && Boolean.TRUE.equals(isActive);
    }
}
