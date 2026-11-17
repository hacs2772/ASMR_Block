package com.asmrblock.block;

import com.asmrblock.block.BlockDtos.BlockEditRequest;
import com.asmrblock.block.BlockDtos.MyUploadResponse;
import com.asmrblock.common.ApiResponse;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.creator.CreatorDtos.MyStatsResponse;
import com.asmrblock.creator.CreatorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 판매자: 내가 올린 블록 (로그인 필요) */
@RestController
@RequestMapping("/api/v1/me/uploads")
@RequiredArgsConstructor
public class MyUploadController {

    private final BlockService blockService;
    private final MyUploadService myUploadService;
    private final CreatorService creatorService;

    @GetMapping
    public ApiResponse<PageResponse<MyUploadResponse>> list(@AuthenticationPrincipal Long userId,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "50") int size) {
        return ApiResponse.ok(blockService.myUploads(userId, PageQuery.of(page, size)));
    }

    /** 내 블록 통계: 담은 사람·쓰인 조합·최근 14일 새로 담김/들은 횟수 (본인 빼고) */
    @GetMapping("/stats")
    public ApiResponse<MyStatsResponse> stats(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(creatorService.myStats(userId));
    }

    /** 고치기: 보낸 것만 바뀜. 돌려보낸 블록이면 다시 검수 대기로 */
    @PatchMapping("/{blockId}")
    public ApiResponse<MyUploadResponse> edit(@AuthenticationPrincipal Long userId, @PathVariable Long blockId,
                                              @Valid @RequestBody BlockEditRequest request) {
        MyUploadService.EditResult result = myUploadService.edit(userId, blockId, request);
        return ApiResponse.ok(result.resubmitted() ? "고쳐서 다시 검수를 요청했어요." : "고쳤어요.", result.upload());
    }
}
