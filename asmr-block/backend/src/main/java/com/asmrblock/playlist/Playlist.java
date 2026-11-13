package com.asmrblock.playlist;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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
    private Integer listenMinutes;   // 얼마나 들을까요? (0 = 한 바퀴만, 그 외 분)
    private Integer playCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 조인 데이터
    private String ownerNickname;
    private Integer recentPlays;     // 요즘 뜨는 조합 조회 시 최근 재생 수
    @Builder.Default
    private List<PlaylistLayer> layers = new ArrayList<>();

    public Optional<PlaylistLayer> layer(LayerRole role) {
        return layers.stream().filter(layer -> layer.getRole() == role).findFirst();
    }

    public boolean isViewableBy(Long userId) {
        return Boolean.TRUE.equals(isPublic) || this.userId.equals(userId);
    }
}
