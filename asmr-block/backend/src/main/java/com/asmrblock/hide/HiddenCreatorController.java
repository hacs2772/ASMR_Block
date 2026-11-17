package com.asmrblock.hide;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.hide.HideDtos.HiddenCreatorResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 크리에이터 숨기기 (로그인 필요): 내가 숨긴 목록 · 숨기기 · 다시 보기 */
@RestController
@RequestMapping("/api/v1/me/hidden-creators")
@RequiredArgsConstructor
public class HiddenCreatorController {

    private final HiddenCreatorService hiddenCreatorService;

    @GetMapping
    public ApiResponse<List<HiddenCreatorResponse>> list(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(hiddenCreatorService.list(userId));
    }

    @PutMapping("/{creatorId}")
    public ApiResponse<Void> hide(@AuthenticationPrincipal Long userId, @PathVariable Long creatorId) {
        hiddenCreatorService.hide(userId, creatorId);
        return ApiResponse.ok("이 크리에이터를 숨겼어요. 블록과 조합이 더는 보이지 않아요.", null);
    }

    @DeleteMapping("/{creatorId}")
    public ApiResponse<Void> unhide(@AuthenticationPrincipal Long userId, @PathVariable Long creatorId) {
        hiddenCreatorService.unhide(userId, creatorId);
        return ApiResponse.ok("다시 보이게 했어요.", null);
    }
}
