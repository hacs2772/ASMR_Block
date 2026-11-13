package com.asmrblock.block;

import com.asmrblock.block.BlockDtos.BlockResponse;
import com.asmrblock.block.BlockDtos.BlockUploadRequest;
import com.asmrblock.common.ApiResponse;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.play.PlayResult;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/blocks")
@RequiredArgsConstructor
public class BlockController {

    private final BlockService blockService;
    private final BlockUploadService blockUploadService;

    // 블록 목록 (승인된 블록만). tagIds=1,2 → 둘 중 하나라도 달린 블록
    @GetMapping
    public ApiResponse<PageResponse<BlockResponse>> search(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(blockService.search(
                categoryId, tagIds, keyword, BlockStatus.APPROVED, sort, PageQuery.of(page, size)));
    }

    // 요즘 뜨는 소리 (최근 7일 재생이 많은 순)
    @GetMapping("/trending")
    public ApiResponse<List<BlockResponse>> trending(@RequestParam(defaultValue = "7") int days,
                                                     @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(blockService.trending(days, size));
    }

    @GetMapping("/{blockId}")
    public ApiResponse<BlockResponse> get(@PathVariable Long blockId) {
        return ApiResponse.ok(blockService.getPlayable(blockId));
    }

    // 음원 업로드 (로그인 필요, 관리자 승인 후 공개)
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<BlockResponse> upload(@AuthenticationPrincipal Long userId,
                                             @Valid @ModelAttribute BlockUploadRequest request) {
        return ApiResponse.ok("업로드되었습니다. 검수 후 공개됩니다.", blockUploadService.upload(userId, request));
    }

    // 재생 기록 (로그인 필요)
    @PostMapping("/{blockId}/play")
    public ApiResponse<PlayResult> recordPlay(@PathVariable Long blockId,
                                              @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(blockService.recordPlay(blockId, userId));
    }
}
