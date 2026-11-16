package com.asmrblock.playlist;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.asmrblock.block.Block;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

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
    private Boolean isHidden;        // 관리자가 숨긴 조합 (V13, 남에게는 안 보임)
    private Integer listenMinutes;   // 얼마나 들을까요? (0 = 한 바퀴만, 그 외 분)
    private Integer playCount;
    private Long sourcePlaylistId;   // 남의 조합을 담아 온 복사본이면 원본 id
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // 조인 데이터
    private String ownerNickname;
    private Long sourceOwnerId;      // 원본 조합을 만든 사람
    private String sourceOwnerNickname;
    private Integer collectCount;    // 이 조합을 담아 간 사람 수
    private Integer recentPlays;     // 요즘 뜨는 조합 조회 시 최근 재생 수
    @Builder.Default
    private List<PlaylistLayer> layers = new ArrayList<>();

    public Optional<PlaylistLayer> layer(LayerRole role) {
        return layers.stream().filter(layer -> layer.getRole() == role).findFirst();
    }

    /** 이 조합에 쓰인 블록 (같은 블록은 한 번만) */
    public List<Block> distinctBlocks() {
        Map<Long, Block> blocks = new LinkedHashMap<>();
        layers.forEach(layer -> layer.getBlocks().forEach(pb -> blocks.putIfAbsent(pb.getBlock().getId(), pb.getBlock())));
        return List.copyOf(blocks.values());
    }

    /** 보는 사람이 아직 갖지 않은 유료 블록 수 (담으려면 구매가 필요한 블록) */
    public int lockedCount(Set<Long> ownedBlockIds) {
        return (int) distinctBlocks().stream()
                .filter(b -> b.isPaid() && !ownedBlockIds.contains(b.getId()))
                .count();
    }

    /** 내 것이거나, 공개이면서 관리자가 숨기지 않은 조합 */
    public boolean isViewableBy(Long userId) {
        return this.userId.equals(userId) || (Boolean.TRUE.equals(isPublic) && !Boolean.TRUE.equals(isHidden));
    }
}
