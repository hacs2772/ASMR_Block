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
            Integer duration,
            Integer price,
            boolean owned,
            TalkType talkType,
            String recordedPlace,
            DesignResponse design,
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
                    block.getDuration(), block.getPrice(), owned,
                    block.getTalkType() == null ? TalkType.NONE : block.getTalkType(), block.getRecordedPlace(),
                    DesignResponse.of(block, storage, canHear || !block.isPaid()),
                    block.getLicense(), block.getSourceUrl(), block.getAttribution(), block.getStatus(),
                    CategoryResponse.from(block.getCategory()),
                    tags == null ? List.of() : tags,
                    new UploaderResponse(block.getUploaderId(), block.getUploaderNickname()),
                    block.getPlayCount(), block.getRecentPlays(), block.getCreatedAt());
        }
    }

    public record UploaderResponse(Long id, String nickname) {
    }

    /**
     * 블록 겉면과 영상 (C안: 사진이 있으면 사진, 없으면 스티커 + 무늬, 둘 다 없으면 트리거 아이콘).
     * videoUrl: 같이 보는 영상(480p, 소리 없음). 유료 블록은 내 것일 때만 주고, hasVideo로 "영상" 표시만
     */
    public record DesignResponse(String coverUrl, List<String> stickers, String pattern, boolean hasVideo, String videoUrl) {

        public static DesignResponse of(Block block, StorageService storage, boolean canWatch) {
            return new DesignResponse(
                    storage.publicUrl(block.getThumbnailKey()),
                    BlockDesign.stickerList(block.getStickers()),
                    block.getStickerPattern() == null ? "dots" : block.getStickerPattern(),
                    block.getVideoKey() != null,
                    canWatch ? storage.publicUrl(block.getVideoKey()) : null);
        }
    }

    /** 음원 업로드 (multipart/form-data). 업로드 후 관리자 승인 전까지 PENDING */
    public record BlockUploadRequest(
            /** 음원 파일. 영상(video)만 올리면 영상의 소리를 뽑아 씀 → file이나 video 중 하나는 꼭 */
            MultipartFile file,

            /** 같이 보는 영상 (선택, 480p·소리 없음으로 줄여서 저장) */
            MultipartFile video,

            /** 블록 겉면 사진 (선택) */
            MultipartFile cover,

            /** 겉면 스티커 코드, 쉼표로 최대 3개 (선택, 사진이 없을 때 보임) */
            @Size(max = 100, message = "스티커가 너무 많아요.")
            String stickers,

            /** 스티커 무늬 dots | lines | none (생략하면 dots) */
            String pattern,

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
            String recordedPlace,

            /** 먼저 올려 둔 소리 파일(POST /blocks/upload-drafts)을 쓸 때. file 대신 */
            @Size(max = 64)
            String draftId,

            /** 구간 고르기 (선택, 초): 둘 다 주면 그 부분만 블록으로. 앞뒤 0.5초는 부드럽게 */
            Double trimStart,
            Double trimEnd) {
    }

    /** 구간 고르기용으로 먼저 올린 소리: 올리기 때 draftId로. peaks = 파형(칸마다 0~1, 400칸) */
    public record UploadDraftResponse(String draftId, double duration, float[] peaks) {
    }

    /** 업로드 규칙 (앱이 화면에 안내하고, 서버도 같은 값으로 검사) */
    public record UploadPolicyResponse(
            int maxPrice,
            int maxFileMb,
            int minSeconds,
            int maxSeconds,
            List<String> extensions,
            int maxVideoMb,
            List<String> videoExtensions,
            int maxImageMb,
            List<String> imageExtensions,
            List<String> stickers,
            List<String> patterns) {
    }

    /**
     * 내가 올린 블록 (판매자용). 검수 상태와 함께, 몇 명이 담았는지(collectedCount, 나 제외)
     * fileUrl: 내 블록이라 항상 전체 음원, reviewNote: 돌려보낸 이유 (REJECTED일 때만)
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
            String reviewNote,
            CategoryResponse category,
            DesignResponse design,
            long collectedCount,
            Integer playCount,
            LocalDateTime createdAt) {

        public static MyUploadResponse from(Block block, long collectedCount, StorageService storage) {
            return new MyUploadResponse(block.getId(), block.getTitle(), storage.publicUrl(block.getFileKey()),
                    block.getDuration(), block.getPrice(),
                    block.getTalkType() == null ? TalkType.NONE : block.getTalkType(), block.getRecordedPlace(),
                    block.getStatus(), block.getReviewNote(), CategoryResponse.from(block.getCategory()), DesignResponse.of(block, storage, true),
                    collectedCount, block.getPlayCount(), block.getCreatedAt());
        }
    }

    public record BlockStatusRequest(
            @NotNull(message = "status는 필수입니다. (APPROVED, REJECTED, PENDING)")
            BlockStatus status,

            /** 돌려보내는 이유 (REJECTED일 때만 저장, 판매자에게 보임) */
            @Size(max = 200, message = "이유는 200자 이내로 적어 주세요.")
            String note) {
    }

    /** 관리자: 가격(코인) 정하기. 0이면 무료 */
    public record BlockPriceRequest(
            @NotNull(message = "price는 필수입니다.")
            @Min(value = 0, message = "가격은 0 이상이어야 합니다.")
            @Max(value = 10000, message = "가격은 10000코인 이하여야 합니다.")
            Integer price) {
    }
}
