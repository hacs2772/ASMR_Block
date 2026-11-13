package com.asmrblock.playlist;

import com.asmrblock.category.CategoryDtos.CategoryResponse;
import com.asmrblock.render.RenderResponse;
import com.asmrblock.storage.StorageService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;

public final class PlaylistDtos {

    private PlaylistDtos() {
    }

    /** 최대 길이: 10시간 (밤새 자는 사람 고려) */
    public static final int MAX_TOTAL_SECONDS = 10 * 60 * 60;
    public static final int MAX_REPEAT = 200;
    public static final int MAX_LISTEN_MINUTES = 600;

    // ===================== 요청 =====================

    /**
     * 플레이리스트 저장 (생성/수정 동일) = 레고 타임라인.
     * main: 메인 트랙 (필수) - 순서대로 이어 재생
     * mix:  믹스 트랙 (선택) - startSeconds 위치에만 블록을 놓아 겹쳐 재생, 사이사이 빈칸 가능
     * listenMinutes: 얼마나 들을까요? 0(또는 생략) = 한 바퀴만, 그 외 = 그 시간 동안 이어서 반복 재생
     * 블록은 내 블록함에 있는 것만 쓸 수 있음 (같은 블록 여러 번은 자유)
     */
    public record PlaylistSaveRequest(
            @NotBlank(message = "제목은 필수입니다.")
            @Size(max = 100, message = "제목은 100자 이내여야 합니다.")
            String title,

            @Size(max = 1000, message = "설명은 1000자 이내여야 합니다.")
            String description,

            Boolean isPublic,

            @NotNull(message = "메인 트랙(main)은 필수입니다.")
            @Valid
            TrackRequest main,

            @Valid
            TrackRequest mix,

            @Min(value = 0, message = "재생 시간은 0분 이상이어야 합니다.")
            @Max(value = MAX_LISTEN_MINUTES, message = "재생 시간은 최대 10시간까지 고를 수 있습니다.")
            Integer listenMinutes) {
    }

    /** 트랙 하나. volume 0.0~1.0 (생략 시 메인 1.0 / 믹스 0.5) */
    public record TrackRequest(
            @DecimalMin(value = "0.0", message = "볼륨은 0.0~1.0 사이여야 합니다.")
            @DecimalMax(value = "1.0", message = "볼륨은 0.0~1.0 사이여야 합니다.")
            Double volume,

            @NotEmpty(message = "트랙에는 블록이 1개 이상 있어야 합니다.")
            @Size(max = 200, message = "한 트랙에는 블록을 최대 200개까지 놓을 수 있습니다.")
            List<@Valid @NotNull(message = "블록 정보가 비어 있습니다.") ItemRequest> items) {
    }

    /**
     * 트랙에 놓는 블록 (레고 한 조각).
     * repeat: 연속 반복 횟수 (생략 시 1, 최대 200)
     * startSeconds: 믹스 트랙에서 시작 시각(초) - 믹스 트랙에서는 필수, 메인 트랙에서는 무시
     */
    public record ItemRequest(
            @NotNull(message = "blockId는 필수입니다.")
            Long blockId,

            @Min(value = 1, message = "반복은 1번 이상이어야 합니다.")
            @Max(value = MAX_REPEAT, message = "반복은 최대 200번까지 가능합니다.")
            Integer repeat,

            @Min(value = 0, message = "시작 시간은 0초 이상이어야 합니다.")
            Integer startSeconds) {

        public int repeatOrOne() {
            return repeat == null ? 1 : repeat;
        }
    }

    // ===================== 응답 =====================

    public record OwnerResponse(Long id, String nickname) {
    }

    /**
     * 트랙에 놓인 블록. duration은 블록 1번 길이, totalDuration = duration x repeat.
     * owned: 보는 사람의 블록함에 있는지. fileUrl은 무료이거나 owned일 때만 (유료 원본 보호)
     */
    public record TrackItemResponse(
            int position,
            Long blockId,
            String title,
            String fileUrl,
            Integer duration,
            int repeat,
            Integer startSeconds,
            int totalDuration,
            boolean playable,
            boolean owned,
            Integer price,
            CategoryResponse category) {
    }

    public record TrackResponse(
            LayerRole role,
            double volume,
            int duration,
            List<TrackItemResponse> items) {

        static TrackResponse from(PlaylistLayer layer, StorageService storage, Set<Long> ownedBlockIds) {
            List<PlaylistBlock> blocks = layer.getBlocks();
            return new TrackResponse(layer.getRole(), layer.getVolume(), layer.duration(),
                    IntStream.range(0, blocks.size()).mapToObj(i -> {
                        PlaylistBlock pb = blocks.get(i);
                        var block = pb.getBlock();
                        boolean owned = ownedBlockIds.contains(block.getId());
                        return new TrackItemResponse(i + 1, block.getId(), block.getTitle(),
                                owned || !block.isPaid() ? storage.publicUrl(block.getFileKey()) : null,
                                block.getDuration(),
                                pb.getRepeatCount(), layer.getRole() == LayerRole.MIX ? pb.getStartSeconds() : null,
                                pb.totalSeconds(), block.isPlayable(), owned, block.getPrice(),
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
            Integer listenMinutes,
            OwnerResponse owner,
            TrackResponse main,
            TrackResponse mix,
            RenderResponse render,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {

        public static PlaylistDetailResponse from(Playlist playlist, RenderResponse render, StorageService storage,
                                                  Set<Long> ownedBlockIds) {
            return new PlaylistDetailResponse(
                    playlist.getId(), playlist.getTitle(), playlist.getDescription(), playlist.getIsPublic(),
                    playlist.getPlayCount(), playlist.getTotalDuration(), playlist.getListenMinutes(),
                    new OwnerResponse(playlist.getUserId(), playlist.getOwnerNickname()),
                    playlist.layer(LayerRole.MAIN).map(l -> TrackResponse.from(l, storage, ownedBlockIds)).orElse(null),
                    playlist.layer(LayerRole.MIX).map(l -> TrackResponse.from(l, storage, ownedBlockIds)).orElse(null),
                    render, playlist.getCreatedAt(), playlist.getUpdatedAt());
        }
    }

    /** 목록용 요약. previewColors: 메인 트랙 왼쪽부터 블록 색 (반복은 1개로, 최대 8개) */
    public record PlaylistSummaryResponse(
            Long id,
            String title,
            String description,
            Boolean isPublic,
            Integer playCount,
            Integer totalDuration,
            Integer listenMinutes,
            OwnerResponse owner,
            int blockCount,
            boolean hasMix,
            List<String> previewColors,
            LocalDateTime createdAt) {

        public static PlaylistSummaryResponse from(Playlist playlist) {
            List<PlaylistBlock> mainBlocks = playlist.layer(LayerRole.MAIN)
                    .map(PlaylistLayer::getBlocks).orElse(List.of());
            return new PlaylistSummaryResponse(
                    playlist.getId(), playlist.getTitle(), playlist.getDescription(), playlist.getIsPublic(),
                    playlist.getPlayCount(), playlist.getTotalDuration(), playlist.getListenMinutes(),
                    new OwnerResponse(playlist.getUserId(), playlist.getOwnerNickname()),
                    playlist.getLayers().stream().mapToInt(l -> l.getBlocks().size()).sum(),
                    playlist.layer(LayerRole.MIX).isPresent(),
                    mainBlocks.stream().limit(8)
                            .map(pb -> pb.getBlock().getCategory() == null ? "#666666"
                                    : pb.getBlock().getCategory().getColor())
                            .toList(),
                    playlist.getCreatedAt());
        }
    }
}
