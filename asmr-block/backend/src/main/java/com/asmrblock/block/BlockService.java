package com.asmrblock.block;

import com.asmrblock.block.BlockDtos.BlockResponse;
import com.asmrblock.category.CategoryDtos.TagResponse;
import com.asmrblock.category.CategoryService;
import com.asmrblock.common.ApiException;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.play.PlayCountService;
import com.asmrblock.play.PlayResult;
import com.asmrblock.play.PlayTarget;
import com.asmrblock.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlockService {

    private final BlockMapper blockMapper;
    private final CategoryService categoryService;
    private final StorageService storageService;
    private final PlayCountService playCountService;

    /** 블록 목록 (public: 승인된 것만 / admin: status 지정) */
    @Transactional(readOnly = true)
    public PageResponse<BlockResponse> search(Long categoryId, List<Long> tagIds, String keyword,
                                              BlockStatus status, String sort, PageQuery page) {
        BlockSearchCondition condition = BlockSearchCondition.builder()
                .categoryId(categoryId)
                .tagIds(tagIds == null || tagIds.isEmpty() ? null : tagIds)
                .keyword(keyword == null || keyword.isBlank() ? null : keyword.trim())
                .status(status)
                .sort("popular".equals(sort) ? "popular" : "latest")
                .offset(page.offset())
                .limit(page.size())
                .build();

        List<Block> blocks = blockMapper.search(condition);
        return PageResponse.of(toResponses(blocks), page, blockMapper.count(condition));
    }

    /** 요즘 뜨는 소리 (최근 days일 재생 수 기준) */
    @Transactional(readOnly = true)
    public List<BlockResponse> trending(int days, int size) {
        return toResponses(blockMapper.findTrending(Math.min(Math.max(days, 1), 30), Math.min(Math.max(size, 1), 50)));
    }

    /** 공개 상세: 승인 전 블록은 없는 것처럼 처리 */
    @Transactional(readOnly = true)
    public BlockResponse getPlayable(Long id) {
        return toResponse(findPlayable(id));
    }

    /** 플레이리스트에 넣을 수 있는(승인된) 블록만 id → 블록으로 */
    @Transactional(readOnly = true)
    public Map<Long, Block> findPlayableByIds(Collection<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return blockMapper.findByIds(ids).stream()
                .filter(Block::isPlayable)
                .collect(Collectors.toMap(Block::getId, Function.identity()));
    }

    // 재생 기록 (로그인 사용자만, 30분 내 중복 재생은 세지 않음)
    @Transactional
    public PlayResult recordPlay(Long blockId, Long userId) {
        Block block = findPlayable(blockId);
        boolean counted = playCountService.record(userId, PlayTarget.BLOCK, blockId);
        if (counted) {
            blockMapper.incrementPlayCount(blockId);
        }
        return new PlayResult(block.getPlayCount() + (counted ? 1 : 0), counted);
    }

    // 관리자: 검수 상태 변경
    @Transactional
    public BlockResponse updateStatus(Long blockId, BlockStatus status) {
        blockMapper.findById(blockId).orElseThrow(() -> ApiException.notFound("블록을 찾을 수 없습니다."));
        blockMapper.updateStatus(blockId, status);
        return toResponse(blockMapper.findById(blockId).orElseThrow());
    }

    BlockResponse toResponse(Block block) {
        return toResponses(List.of(block)).getFirst();
    }

    private List<BlockResponse> toResponses(List<Block> blocks) {
        Map<Long, List<TagResponse>> tags = categoryService.tagsByBlockIds(
                blocks.stream().map(Block::getId).toList());
        return blocks.stream()
                .map(block -> BlockResponse.from(block, tags.get(block.getId()), storageService))
                .toList();
    }

    private Block findPlayable(Long id) {
        return blockMapper.findById(id)
                .filter(Block::isPlayable)
                .orElseThrow(() -> ApiException.notFound("블록을 찾을 수 없습니다."));
    }
}
