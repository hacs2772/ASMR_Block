package com.asmrblock.service;

import com.asmrblock.domain.Block;
import com.asmrblock.domain.SoundTag;
import com.asmrblock.dto.response.BlockResponse;
import com.asmrblock.dto.response.PageResponse;
import com.asmrblock.exception.CustomException;
import com.asmrblock.repository.BlockRepository;
import com.asmrblock.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlockService {
    
    private final BlockRepository blockRepository;
    private final CategoryRepository categoryRepository;
    
    // 블록 목록 조회
    @Transactional(readOnly = true)
    public PageResponse<BlockResponse> getBlocks(
            Long categoryId, 
            List<Long> tagIds, 
            String keyword,
            int page, 
            int size, 
            String sort) {
        
        int offset = page * size;
        
        // 승인된 블록만 조회
        List<Block> blocks = blockRepository.findAll(
            categoryId, tagIds, keyword, "APPROVED", offset, size, sort);
        
        // 각 블록의 태그 조회
        blocks.forEach(block -> {
            List<SoundTag> tags = categoryRepository.findTagsByBlockId(block.getId());
            block.setTags(tags);
        });
        
        long totalElements = blockRepository.countAll(categoryId, tagIds, keyword, "APPROVED");
        
        List<BlockResponse> content = blocks.stream()
                .map(BlockResponse::from)
                .collect(Collectors.toList());
        
        return PageResponse.of(content, page, size, totalElements);
    }
    
    // 블록 상세 조회
    @Transactional(readOnly = true)
    public BlockResponse getBlock(Long id) {
        Block block = blockRepository.findById(id)
                .orElseThrow(() -> CustomException.notFound("블록을 찾을 수 없습니다."));
        
        // 태그 조회
        List<SoundTag> tags = categoryRepository.findTagsByBlockId(id);
        block.setTags(tags);
        
        return BlockResponse.from(block);
    }
    
    // 재생 횟수 증가
    @Transactional
    public int incrementPlayCount(Long id) {
        Block block = blockRepository.findById(id)
                .orElseThrow(() -> CustomException.notFound("블록을 찾을 수 없습니다."));
        
        blockRepository.incrementPlayCount(id);
        
        return block.getPlayCount() + 1;
    }
}
