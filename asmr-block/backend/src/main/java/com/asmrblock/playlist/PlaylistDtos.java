package com.asmrblock.playlist;

import com.asmrblock.category.CategoryDtos.CategoryResponse;
import com.asmrblock.render.RenderResponse;
import com.asmrblock.storage.StorageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.IntStream;

public final class PlaylistDtos {

    private PlaylistDtos() {
    }

    // ===================== 요청 =====================

    /**
     * 플레이리스트 저장 (생성/수정 동일).
     * main: 메인 동 (필수), background: 배경 동 (선택)
     */
    public record PlaylistSaveRequest(
            @NotBlank(message = "제목은 필수입니다.")
            @Size(max = 100, message = "제목은 100자 이내여야 합니다.")
            String title,

            @Size(max = 1000, message = "설명은 1000자 이내여야 합니다.")
            String description,

            Boolean isPublic,

            @NotNull(message = "메인 동(main)은 필수입니다.")
            @Valid
            LayerRequest main,

            @Valid
            LayerRequest background) {
    }

    /**
     * 동 하나. blockIds 순서대로 아래층부터 쌓임 (같은 블록 반복 가능).
     * volume: 0.0~1.0 (생략 시 메인 1.0 / 배경 0.5)
     * loop: 배경 동이 메인보다 짧으면 반복해서 채움 (생략 시 true, 메인 동에서는 무시)
     */
    public record LayerRequest(
            @DecimalMin(value = "0.0", message = "볼륨은 0.0~1.0 사이여야 합니다.")
            @DecimalMax(value = "1.0", message = "볼륨은 0.0~1.0 사이여야 합니다.")
            Double volume,

            Boolean loop,

            @NotEmpty(message = "동에는 블록이 1개 이상 있어야 합니다.")
            @Size(max = 100, message = "한 동에는 블록을 최대 100개까지 쌓을 수 있습니다.")
            List<@NotNull(message = "blockId가 비어 있습니다.") Long> blockIds) {
    }

    // ===================== 응답 =====================

    public record OwnerResponse(Long id, String nickname) {
    }

    public record LayerBlockResponse(
            int position,
            Long blockId,
            String title,
            String fileUrl,
            Integer duration,
            boolean playable,
            CategoryResponse category) {
    }

    public record LayerResponse(
            LayerRole role,
            double volume,
            boolean loop,
            int duration,
            List<LayerBlockResponse> blocks) {

        static LayerResponse from(PlaylistLayer layer, StorageService storage) {
            List<PlaylistBlock> blocks = layer.getBlocks();
            return new LayerResponse(layer.getRole(), layer.getVolume(), Boolean.TRUE.equals(layer.getLoopToFill()),
                    layer.duration(),
                    IntStream.range(0, blocks.size()).mapToObj(i -> {
                        var block = blocks.get(i).getBlock();
                        return new LayerBlockResponse(i + 1, block.getId(), block.getTitle(),
                                storage.publicUrl(block.getFileKey()), block.getDuration(), block.isPlayable(),
                                CategoryResponse.from(block.getCategory()));
                    }).toList());
        }
    }

    public record PlaylistDetailResponse(
            Long id,
            String title,
            String description,
            Boolean isPublic,
            Integer playCount,
            Integer totalDuration,
            OwnerResponse owner,
            LayerResponse main,
            LayerResponse background,
            RenderResponse render,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {

        public static PlaylistDetailResponse from(Playlist playlist, RenderResponse render, StorageService storage) {
            return new PlaylistDetailResponse(
                    playlist.getId(), playlist.getTitle(), playlist.getDescription(), playlist.getIsPublic(),
                    playlist.getPlayCount(), playlist.getTotalDuration(),
                    new OwnerResponse(playlist.getUserId(), playlist.getOwnerNickname()),
                    playlist.layer(LayerRole.MAIN).map(l -> LayerResponse.from(l, storage)).orElse(null),
                    playlist.layer(LayerRole.BACKGROUND).map(l -> LayerResponse.from(l, storage)).orElse(null),
                    render, playlist.getCreatedAt(), playlist.getUpdatedAt());
        }
    }

    /** 목록용 요약. previewColors: 메인 동 아래층부터 블록 색 (최대 8개) */
    public record PlaylistSummaryResponse(
            Long id,
            String title,
            String description,
            Boolean isPublic,
            Integer playCount,
            Integer totalDuration,
            OwnerResponse owner,
            int blockCount,
            boolean hasBackground,
            List<String> previewColors,
            LocalDateTime createdAt) {

        public static PlaylistSummaryResponse from(Playlist playlist) {
            List<PlaylistBlock> mainBlocks = playlist.layer(LayerRole.MAIN)
                    .map(PlaylistLayer::getBlocks).orElse(List.of());
            return new PlaylistSummaryResponse(
                    playlist.getId(), playlist.getTitle(), playlist.getDescription(), playlist.getIsPublic(),
                    playlist.getPlayCount(), playlist.getTotalDuration(),
                    new OwnerResponse(playlist.getUserId(), playlist.getOwnerNickname()),
                    playlist.getLayers().stream().mapToInt(l -> l.getBlocks().size()).sum(),
                    playlist.layer(LayerRole.BACKGROUND).isPresent(),
                    mainBlocks.stream().limit(8)
                            .map(pb -> pb.getBlock().getCategory() == null ? "#666666"
                                    : pb.getBlock().getCategory().getColor())
                            .toList(),
                    playlist.getCreatedAt());
        }
    }
}
