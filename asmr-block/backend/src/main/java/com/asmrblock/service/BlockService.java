package com.asmrblock.service;

import com.asmrblock.domain.Block;
import com.asmrblock.domain.SoundTag;
import com.asmrblock.dto.response.BlockResponse;
import com.asmrblock.dto.response.PageResponse;
import com.asmrblock.exception.CustomException;
import com.asmrblock.repository.BlockRepository;
import com.asmrblock.repository.CategoryRepository;
import com.asmrblock.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BlockService {

    public static final String STATUS_APPROVED = "APPROVED";

    private final BlockRepository blockRepository;
    private final CategoryRepository categoryRepository;
    private final StorageService storageService;
    private final PlayCountService playCountService;

    // 블록 목록 조회 (승인된 블록만)
    @Transactional(readOnly = true)
    public PageResponse<BlockResponse> getBlocks(Long categoryId, List<Long> tagIds, String keyword,
                                                 int page, int size, String sort) {
        int offset = page * size;
        List<Block> blocks = blockRepository.findAll(
                categoryId, tagIds, keyword, STATUS_APPROVED, offset, size, sort);

        // TODO: 블록이 많아지면 태그를 한 번에 조회하도록 개선 (지금은 블록마다 1번씩 조회)
        blocks.forEach(block -> block.setTags(categoryRepository.findTagsByBlockId(block.getId())));

        long totalElements = blockRepository.countAll(categoryId, tagIds, keyword, STATUS_APPROVED);
        List<BlockResponse> content = blocks.stream()
                .map(block -> BlockResponse.from(block, storageService))
                .toList();

        return PageResponse.of(content, page, size, totalElements);
    }

    // 블록 상세 조회 (승인 전 블록은 없는 것처럼 처리)
    @Transactional(readOnly = true)
    public BlockResponse getBlock(Long id) {
        Block block = findApprovedBlock(id);
        List<SoundTag> tags = categoryRepository.findTagsByBlockId(id);
        block.setTags(tags);
        return BlockResponse.from(block, storageService);
    }

    // 재생 기록 (로그인 사용자만, 30분 내 중복 재생은 세지 않음)
    @Transactional
    public PlayResult recordPlay(Long blockId, Long userId) {
        Block block = findApprovedBlock(blockId);
        boolean counted = playCountService.record(userId, PlayCountService.BLOCK, blockId);
        if (counted) {
            blockRepository.incrementPlayCount(blockId);
        }
        return new PlayResult(block.getPlayCount() + (counted ? 1 : 0), counted);
    }

    private Block findApprovedBlock(Long id) {
        return blockRepository.findById(id)
                .filter(block -> STATUS_APPROVED.equals(block.getStatus()))
                .orElseThrow(() -> CustomException.notFound("블록을 찾을 수 없습니다."));
    }

    public record PlayResult(int playCount, boolean counted) {
    }
}
