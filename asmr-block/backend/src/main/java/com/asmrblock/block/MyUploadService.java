package com.asmrblock.block;

import com.asmrblock.block.BlockDtos.BlockEditRequest;
import com.asmrblock.block.BlockDtos.MyUploadResponse;
import com.asmrblock.common.ApiException;
import com.asmrblock.config.AppProperties;
import com.asmrblock.storage.StorageService;
import com.asmrblock.user.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

/**
 * 판매자: 내가 올린 블록 고치기 — 제목·소개·녹음한 곳(+영어)·말소리·가격·상점에서 내리기/다시 올리기.
 * 승인된 블록은 고쳐도 그대로 판매(이상한 글은 신고로 관리), 돌려보낸 블록은 고치면 다시 검수 대기(PENDING)
 */
@Service
@RequiredArgsConstructor
public class MyUploadService {

    private final BlockMapper blockMapper;
    private final UserMapper userMapper;
    private final AppProperties properties;
    private final BlockPreviewService previewService;
    private final StorageService storageService;

    /** 고친 결과. resubmitted = 돌려보낸 블록을 고쳐서 다시 검수 대기로 */
    public record EditResult(MyUploadResponse upload, boolean resubmitted) {
    }

    @Transactional
    public EditResult edit(Long userId, Long blockId, BlockEditRequest r) {
        Block block = blockMapper.findById(blockId).orElseThrow(() -> ApiException.notFound("블록을 찾을 수 없습니다."));
        if (!Objects.equals(block.getUploaderId(), userId)) {
            throw ApiException.forbidden("내가 올린 블록만 고칠 수 있어요.");
        }
        BlockUploadService.checkNotBanned(userMapper, userId);
        if (r.title() != null) {
            if (r.title().isBlank()) {
                throw ApiException.badRequest("제목은 비울 수 없어요.");
            }
            block.setTitle(r.title().trim());
        }
        if (r.price() != null) {
            int max = properties.shop().sellerMaxPrice();
            if (r.price() > max && !BlockUploadService.isAdmin(userMapper, userId)) {
                throw ApiException.badRequest("가격은 최대 %d코인까지 정할 수 있어요.".formatted(max));
            }
            block.setPrice(r.price());
        }
        if (r.description() != null) {
            block.setDescription(blankToNull(r.description()));
        }
        if (r.recordedPlace() != null) {
            block.setRecordedPlace(blankToNull(r.recordedPlace()));
        }
        if (r.titleEn() != null) {
            block.setTitleEn(blankToNull(r.titleEn()));
        }
        if (r.descriptionEn() != null) {
            block.setDescriptionEn(blankToNull(r.descriptionEn()));
        }
        if (r.recordedPlaceEn() != null) {
            block.setRecordedPlaceEn(blankToNull(r.recordedPlaceEn()));
        }
        if (r.talkType() != null) {
            block.setTalkType(r.talkType());
        }
        if (r.listed() != null) {
            block.setIsListed(r.listed());
        }
        // 돌려보낸 블록의 내용을 고치면 → 다시 검수 대기 (이유 메모는 지움)
        boolean contentChanged = r.title() != null || r.description() != null || r.recordedPlace() != null
                || r.titleEn() != null || r.descriptionEn() != null || r.recordedPlaceEn() != null
                || r.talkType() != null || r.price() != null;
        boolean resubmitted = block.getStatus() == BlockStatus.REJECTED && contentChanged;
        if (resubmitted) {
            block.setStatus(BlockStatus.PENDING);
            block.setReviewNote(null);
        }
        if (block.getIsListed() == null) {
            block.setIsListed(true);
        }
        blockMapper.updateDetails(block);
        // 판매 중인 블록을 유료로 바꾸면 맛보기(앞 30초)를 만듦
        if (block.getStatus() == BlockStatus.APPROVED) {
            previewService.ensurePreview(block);
        }
        long collected = blockMapper.countCollectors(List.of(blockId)).stream()
                .mapToLong(BlockCount::getCount).sum();
        return new EditResult(MyUploadResponse.from(block, collected, storageService), resubmitted);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
