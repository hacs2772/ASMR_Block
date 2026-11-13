package com.asmrblock.block;

import com.asmrblock.block.BlockDtos.BlockResponse;
import com.asmrblock.block.BlockDtos.MyUploadResponse;
import com.asmrblock.category.CategoryDtos.TagResponse;
import com.asmrblock.category.CategoryService;
import com.asmrblock.common.ApiException;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.library.LibraryMapper;
import com.asmrblock.library.LibrarySource;
import com.asmrblock.play.PlayCountService;
import com.asmrblock.play.PlayResult;
import com.asmrblock.play.PlayTarget;
import com.asmrblock.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlockService {

    private final BlockMapper blockMapper;
    private final CategoryService categoryService;
    private final StorageService storageService;
    private final PlayCountService playCountService;
    private final LibraryMapper libraryMapper;
    private final BlockPreviewService previewService;

    /** 블록 상점 목록 (승인된 것만). viewerId: 로그인 사용자 (owned 표시용, 비로그인 null) */
    @Transactional(readOnly = true)
    public PageResponse<BlockResponse> search(Long categoryId, List<Long> tagIds, String keyword, Boolean free,
                                              TalkType talkType, String sort, PageQuery page, Long viewerId) {
        BlockSearchCondition condition = condition(categoryId, tagIds, keyword, free, talkType, BlockStatus.APPROVED, sort, page);
        List<Block> blocks = blockMapper.search(condition);
        return PageResponse.of(toResponses(blocks, viewerId, false), page, blockMapper.count(condition));
    }

    /** 관리자 검수 목록: 상태별, 전체 음원 주소까지 */
    @Transactional(readOnly = true)
    public PageResponse<BlockResponse> searchForAdmin(BlockStatus status, PageQuery page) {
        BlockSearchCondition condition = condition(null, null, null, null, null, status, "latest", page);
        List<Block> blocks = blockMapper.search(condition);
        return PageResponse.of(toResponses(blocks, null, true), page, blockMapper.count(condition));
    }

    /** 요즘 뜨는 소리 (최근 days일 재생 수 기준) */
    @Transactional(readOnly = true)
    public List<BlockResponse> trending(int days, int size, Long viewerId) {
        return toResponses(blockMapper.findTrending(Math.min(Math.max(days, 1), 30), Math.min(Math.max(size, 1), 50)),
                viewerId, false);
    }

    /** 공개 상세: 승인 전 블록은 없는 것처럼 처리 */
    @Transactional(readOnly = true)
    public BlockResponse getPlayable(Long id, Long viewerId) {
        return toResponse(findPlayable(id), viewerId);
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

    // 관리자: 검수 상태 변경. 승인되면 올린 사람의 블록함에 들어가고, 유료면 맛보기를 만듦
    @Transactional
    public BlockResponse updateStatus(Long blockId, BlockStatus status) {
        findAny(blockId);
        blockMapper.updateStatus(blockId, status);
        Block block = findAny(blockId);
        if (status == BlockStatus.APPROVED) {
            libraryMapper.insert(block.getUploaderId(), blockId, LibrarySource.CREATOR);
            previewService.ensurePreview(block);
        }
        return toAdminResponse(block);
    }

    // 관리자: 가격(코인) 정하기. 유료가 되면 맛보기를 만듦
    @Transactional
    public BlockResponse updatePrice(Long blockId, int price) {
        findAny(blockId);
        blockMapper.updatePrice(blockId, price);
        Block block = findAny(blockId);
        previewService.ensurePreview(block);
        return toAdminResponse(block);
    }

    /** 내가 올린 블록 (판매자용): 검수 상태 + 담은 사람 수 */
    @Transactional(readOnly = true)
    public PageResponse<MyUploadResponse> myUploads(Long uploaderId, PageQuery page) {
        List<Block> blocks = blockMapper.findByUploader(uploaderId, page.offset(), page.size());
        Map<Long, Long> collected = blocks.isEmpty() ? Map.of()
                : blockMapper.countCollectors(blocks.stream().map(Block::getId).toList()).stream()
                        .collect(Collectors.toMap(BlockCount::getBlockId, BlockCount::getCount));
        return PageResponse.of(blocks.stream()
                        .map(b -> MyUploadResponse.from(b, collected.getOrDefault(b.getId(), 0L), storageService))
                        .toList(),
                page, blockMapper.countByUploader(uploaderId));
    }

    public Block findPlayable(Long id) {
        return blockMapper.findById(id)
                .filter(Block::isPlayable)
                .orElseThrow(() -> ApiException.notFound("블록을 찾을 수 없습니다."));
    }

    public BlockResponse toResponse(Block block, Long viewerId) {
        return toResponses(List.of(block), viewerId, false).getFirst();
    }

    /** 내 블록함 목록용: 모두 내 것 */
    public List<BlockResponse> toLibraryResponses(List<Block> blocks) {
        Map<Long, List<TagResponse>> tags = categoryService.tagsByBlockIds(blocks.stream().map(Block::getId).toList());
        return blocks.stream()
                .map(block -> BlockResponse.from(block, tags.get(block.getId()), storageService, true, true))
                .toList();
    }

    private BlockResponse toAdminResponse(Block block) {
        return toResponses(List.of(block), null, true).getFirst();
    }

    private List<BlockResponse> toResponses(List<Block> blocks, Long viewerId, boolean revealAll) {
        List<Long> ids = blocks.stream().map(Block::getId).toList();
        Map<Long, List<TagResponse>> tags = categoryService.tagsByBlockIds(ids);
        Set<Long> owned = viewerId == null || ids.isEmpty() ? Set.of() : new HashSet<>(libraryMapper.findOwnedIds(viewerId, ids));
        return blocks.stream()
                .map(block -> {
                    boolean mine = owned.contains(block.getId());
                    return BlockResponse.from(block, tags.get(block.getId()), storageService, mine, mine || revealAll);
                })
                .toList();
    }

    private Block findAny(Long id) {
        return blockMapper.findById(id).orElseThrow(() -> ApiException.notFound("블록을 찾을 수 없습니다."));
    }

    private static BlockSearchCondition condition(Long categoryId, List<Long> tagIds, String keyword, Boolean free,
                                                  TalkType talkType, BlockStatus status, String sort, PageQuery page) {
        return BlockSearchCondition.builder()
                .categoryId(categoryId)
                .tagIds(tagIds == null || tagIds.isEmpty() ? null : tagIds)
                .keyword(keyword == null || keyword.isBlank() ? null : keyword.trim())
                .free(free)
                .talkType(talkType)
                .status(status)
                .sort("popular".equals(sort) ? "popular" : "latest")
                .offset(page.offset())
                .limit(page.size())
                .build();
    }
}
