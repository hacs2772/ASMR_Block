package com.asmrblock.controller;

import com.asmrblock.dto.response.ApiResponse;
import com.asmrblock.dto.response.BlockResponse;
import com.asmrblock.dto.response.PageResponse;
import com.asmrblock.exception.CustomException;
import com.asmrblock.service.BlockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

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

        PageResponse<BlockResponse> response = blockService.getBlocks(
                categoryId, parseTagIds(tagIds), keyword, Paging.page(page), Paging.size(size), sort);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    // 블록 상세 조회
    @GetMapping("/{blockId}")
    public ResponseEntity<ApiResponse<BlockResponse>> getBlock(@PathVariable Long blockId) {
        return ResponseEntity.ok(ApiResponse.success(blockService.getBlock(blockId)));
    }

    // 재생 기록 (로그인 필요)
    @PostMapping("/{blockId}/play")
    public ResponseEntity<ApiResponse<BlockService.PlayResult>> recordPlay(
            @PathVariable Long blockId,
            @AuthenticationPrincipal Long userId) {
        return ResponseEntity.ok(ApiResponse.success(blockService.recordPlay(blockId, userId)));
    }

    // "1,2,3" → [1, 2, 3]
    private static List<Long> parseTagIds(String tagIds) {
        if (tagIds == null || tagIds.isBlank()) {
            return null;
        }
        try {
            return Arrays.stream(tagIds.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Long::parseLong)
                    .toList();
        } catch (NumberFormatException e) {
            throw CustomException.badRequest("tagIds는 숫자를 쉼표로 구분해서 보내주세요. 예) 1,2,3");
        }
    }
}
