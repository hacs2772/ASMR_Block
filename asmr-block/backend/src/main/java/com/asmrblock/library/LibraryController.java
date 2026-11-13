package com.asmrblock.library;

import com.asmrblock.block.BlockDtos.BlockResponse;
import com.asmrblock.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 내 블록함 (로그인 필요) */
@RestController
@RequestMapping("/api/v1/me/blocks")
@RequiredArgsConstructor
public class LibraryController {

    private final LibraryService libraryService;

    @GetMapping
    public ApiResponse<List<BlockResponse>> list(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(libraryService.list(userId));
    }

    // 담기 (이미 담겨 있어도 성공)
    @PostMapping("/{blockId}")
    public ApiResponse<BlockResponse> add(@AuthenticationPrincipal Long userId, @PathVariable Long blockId) {
        return ApiResponse.ok("내 블록함에 담았어요.", libraryService.add(userId, blockId));
    }

    @DeleteMapping("/{blockId}")
    public ApiResponse<Void> remove(@AuthenticationPrincipal Long userId, @PathVariable Long blockId) {
        libraryService.remove(userId, blockId);
        return ApiResponse.message("내 블록함에서 뺐어요.");
    }
}
