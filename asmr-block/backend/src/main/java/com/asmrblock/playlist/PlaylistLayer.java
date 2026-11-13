package com.asmrblock.playlist;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlaylistLayer {

    private Long id;
    private Long playlistId;
    private LayerRole role;
    private Double volume;           // 0.0 ~ 1.0
    private Boolean loopToFill;      // 메인보다 짧으면 반복 (배경 동)
    @Builder.Default
    private List<PlaylistBlock> blocks = new ArrayList<>();

    public int duration() {
        return blocks.stream().mapToInt(pb -> pb.getBlock().getDuration()).sum();
    }
}
