package com.asmrblock.block;

import com.asmrblock.block.BlockDtos.MyUploadResponse;
import com.asmrblock.common.ApiResponse;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 판매자: 내가 올린 블록 (로그인 필요) */
@RestController
@RequestMapping("/api/v1/me/uploads")
@RequiredArgsConstructor
public class MyUploadController {

    private final BlockService blockService;

    @GetMapping
    public ApiResponse<PageResponse<MyUploadResponse>> list(@AuthenticationPrincipal Long userId,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "50") int size) {
        return ApiResponse.ok(blockService.myUploads(userId, PageQuery.of(page, size)));
    }
}
