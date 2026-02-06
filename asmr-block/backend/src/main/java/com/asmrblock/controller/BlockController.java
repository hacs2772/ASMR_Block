package com.asmrblock.controller;

import com.asmrblock.dto.response.ApiResponse;
import com.asmrblock.dto.response.BlockResponse;
import com.asmrblock.dto.response.PageResponse;
import com.asmrblock.service.BlockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/blocks")
@RequiredArgsConstructor
public class BlockController {
    
    private final BlockService blockService;
    
    // 블록 목록 조회
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<BlockResponse>>> getBlocks(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String tagIds,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "latest") String sort) {
        
        // tagIds 문자열을 List<Long>으로 변환
        List<Long> tagIdList = null;
        if (tagIds != null && !tagIds.isEmpty()) {
            tagIdList = Arrays.stream(tagIds.split(","))
                    .map(String::trim)
                    .map(Long::parseLong)
                    .collect(Collectors.toList());
        }
        
        PageResponse<BlockResponse> response = blockService.getBlocks(
            categoryId, tagIdList, keyword, page, size, sort);
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    // 블록 상세 조회
    @GetMapping("/{blockId}")
    public ResponseEntity<ApiResponse<BlockResponse>> getBlock(@PathVariable Long blockId) {
        BlockResponse response = blockService.getBlock(blockId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    // 재생 횟수 증가
    @PostMapping("/{blockId}/play")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> incrementPlayCount(
            @PathVariable Long blockId) {
        int playCount = blockService.incrementPlayCount(blockId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("playCount", playCount)));
    }
}
