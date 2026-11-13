package com.asmrblock.block;

import com.asmrblock.category.CategoryDtos.CategoryResponse;
import com.asmrblock.category.CategoryDtos.TagResponse;
import com.asmrblock.storage.StorageService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

public final class BlockDtos {

    private BlockDtos() {
    }

    /**
     * 블록.
     * price: 코인 (0이면 무료)
     * owned: 내 블록함에 있는지 (비로그인이면 false)
     * fileUrl: 전체 음원 - 무료이거나 내 블록함에 있을 때만, 아니면 null
     * previewUrl: 미리듣기 - 무료는 전체, 유료는 앞 30초 맛보기 (아직 못 만들었으면 null)
     * talkType: 말소리 (NONE 노토킹 / WHISPER 속삭임 / TALK 말하기), recordedPlace: 녹음한 곳 (없으면 null)
     */
    public record BlockResponse(
            Long id,
            String title,
            String description,
            String fileUrl,
            String previewUrl,
            String thumbnailUrl,
            Integer duration,
            Integer price,
            boolean owned,
            TalkType talkType,
            String recordedPlace,
            License license,
            String sourceUrl,
            String attribution,
            BlockStatus status,
            CategoryResponse category,
            List<TagResponse> tags,
            UploaderResponse uploader,
            Integer playCount,
            Integer recentPlays,
            LocalDateTime createdAt) {

        /** canHear: 전체 음원 주소를 보여줘도 되는지 (무료 / 내 블록함 / 관리자 검수) */
        public static BlockResponse from(Block block, List<TagResponse> tags, StorageService storage,
                                         boolean owned, boolean canHear) {
            String fullUrl = storage.publicUrl(block.getFileKey());
            return new BlockResponse(
                    block.getId(), block.getTitle(), block.getDescription(),
                    canHear || !block.isPaid() ? fullUrl : null,
                    block.isPaid() ? storage.publicUrl(block.getPreviewKey()) : fullUrl,
                    storage.publicUrl(block.getThumbnailKey()),
                    block.getDuration(), block.getPrice(), owned,
                    block.getTalkType() == null ? TalkType.NONE : block.getTalkType(), block.getRecordedPlace(),
                    block.getLicense(), block.getSourceUrl(), block.getAttribution(), block.getStatus(),
                    CategoryResponse.from(block.getCategory()),
                    tags == null ? List.of() : tags,
                    new UploaderResponse(block.getUploaderId(), block.getUploaderNickname()),
                    block.getPlayCount(), block.getRecentPlays(), block.getCreatedAt());
        }
    }

    public record UploaderResponse(Long id, String nickname) {
    }

    /** 음원 업로드 (multipart/form-data). 업로드 후 관리자 승인 전까지 PENDING */
    public record BlockUploadRequest(
            @NotNull(message = "음원 파일(file)은 필수입니다.")
            MultipartFile file,

            @NotBlank(message = "제목은 필수입니다.")
            @Size(max = 100, message = "제목은 100자 이내여야 합니다.")
            String title,

            @Size(max = 1000, message = "설명은 1000자 이내여야 합니다.")
            String description,

            @NotNull(message = "카테고리는 필수입니다.")
            Long categoryId,

            @Size(max = 5, message = "태그는 최대 5개까지 달 수 있습니다.")
            List<Long> tagIds,

            @NotNull(message = "라이선스는 필수입니다. (CC0, CC_BY, OWN, CREATOR)")
            License license,

            @Size(max = 500, message = "출처 URL이 너무 깁니다.")
            String sourceUrl,

            @Size(max = 300, message = "출처 표기 문구가 너무 깁니다.")
            String attribution,

            /** 판매 가격(코인). 생략하거나 0이면 무료, 최대는 업로드 규칙의 maxPrice */
            @Min(value = 0, message = "가격은 0 이상이어야 합니다.")
            Integer price,

            /** 말소리. 생략하면 NONE(노토킹) */
            TalkType talkType,

            /** 녹음한 곳 (선택, 예: 도쿄 신주쿠역 앞) */
            @Size(max = 60, message = "녹음한 곳은 60자 이내여야 합니다.")
            String recordedPlace) {
    }

    /** 업로드 규칙 (앱이 화면에 안내하고, 서버도 같은 값으로 검사) */
    public record UploadPolicyResponse(
            int maxPrice,
            int maxFileMb,
            int minSeconds,
            int maxSeconds,
            List<String> extensions) {
    }

    /**
     * 내가 올린 블록 (판매자용). 검수 상태와 함께, 몇 명이 담았는지(collectedCount, 나 제외)
     * fileUrl: 내 블록이라 항상 전체 음원
     */
    public record MyUploadResponse(
            Long id,
            String title,
            String fileUrl,
            Integer duration,
            Integer price,
            TalkType talkType,
            String recordedPlace,
            BlockStatus status,
            CategoryResponse category,
            long collectedCount,
            Integer playCount,
            LocalDateTime createdAt) {

        public static MyUploadResponse from(Block block, long collectedCount, StorageService storage) {
            return new MyUploadResponse(block.getId(), block.getTitle(), storage.publicUrl(block.getFileKey()),
                    block.getDuration(), block.getPrice(),
                    block.getTalkType() == null ? TalkType.NONE : block.getTalkType(), block.getRecordedPlace(),
                    block.getStatus(), CategoryResponse.from(block.getCategory()),
                    collectedCount, block.getPlayCount(), block.getCreatedAt());
        }
    }

    public record BlockStatusRequest(
            @NotNull(message = "status는 필수입니다. (APPROVED, REJECTED, PENDING)")
            BlockStatus status) {
    }

    /** 관리자: 가격(코인) 정하기. 0이면 무료 */
    public record BlockPriceRequest(
            @NotNull(message = "price는 필수입니다.")
            @Min(value = 0, message = "가격은 0 이상이어야 합니다.")
            @Max(value = 10000, message = "가격은 10000코인 이하여야 합니다.")
            Integer price) {
    }
}
