package com.asmrblock.block;

import com.asmrblock.block.BlockDtos.BlockResponse;
import com.asmrblock.block.BlockDtos.BlockStatusRequest;
import com.asmrblock.common.ApiResponse;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** 관리자 전용 (SecurityConfig에서 ADMIN 권한 확인) */
@RestController
@RequestMapping("/api/v1/admin/blocks")
@RequiredArgsConstructor
public class AdminBlockController {

    private final BlockService blockService;

    // 검수 목록 (기본: 승인 대기)
    @GetMapping
    public ApiResponse<PageResponse<BlockResponse>> list(
            @RequestParam(defaultValue = "PENDING") BlockStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(blockService.search(null, null, null, status, "latest", PageQuery.of(page, size)));
    }

    // 승인 / 거절
    @PatchMapping("/{blockId}/status")
    public ApiResponse<BlockResponse> updateStatus(@PathVariable Long blockId,
                                                   @Valid @RequestBody BlockStatusRequest request) {
        return ApiResponse.ok(blockService.updateStatus(blockId, request.status()));
    }
}
