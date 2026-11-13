package com.asmrblock.library;

import com.asmrblock.block.Block;
import com.asmrblock.block.BlockDtos.BlockResponse;
import com.asmrblock.block.BlockService;
import com.asmrblock.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 내 블록함: 블록 상점에서 담은 블록. 편집기에서는 여기 있는 블록만 쓸 수 있음.
 * 같은 블록을 조합 안에서 몇 번 복제하든 추가 비용은 없음 (블록함에 한 번만 있으면 됨).
 */
@Service
@RequiredArgsConstructor
public class LibraryService {

    private final LibraryMapper libraryMapper;
    private final BlockService blockService;

    @Transactional(readOnly = true)
    public List<BlockResponse> list(Long userId) {
        return blockService.toLibraryResponses(libraryMapper.findBlocks(userId));
    }

    /** 담기: 무료 블록만. 유료 블록은 구매 기능이 열리면 구매로 담김 */
    @Transactional
    public BlockResponse add(Long userId, Long blockId) {
        Block block = blockService.findPlayable(blockId);
        if (block.isPaid() && libraryMapper.findSource(userId, blockId).isEmpty()) {
            throw ApiException.paymentRequired("유료 블록은 구매 기능이 열리면 담을 수 있어요.");
        }
        libraryMapper.insert(userId, blockId, LibrarySource.FREE);
        return blockService.toResponse(block, userId);
    }

    /** 빼기: 무료로 담은 블록만 (구매·지급 블록은 그대로 둠) */
    @Transactional
    public void remove(Long userId, Long blockId) {
        LibrarySource source = libraryMapper.findSource(userId, blockId)
                .orElseThrow(() -> ApiException.notFound("내 블록함에 없는 블록이에요."));
        if (source != LibrarySource.FREE) {
            throw ApiException.badRequest("구매했거나 받은 블록은 뺄 수 없어요.");
        }
        libraryMapper.delete(userId, blockId);
    }

    /** blockIds 중 userId의 블록함에 있는 것 (userId가 null이면 빈 집합) */
    @Transactional(readOnly = true)
    public Set<Long> ownedIds(Long userId, Collection<Long> blockIds) {
        if (userId == null || blockIds.isEmpty()) {
            return Set.of();
        }
        return new HashSet<>(libraryMapper.findOwnedIds(userId, blockIds));
    }
}
