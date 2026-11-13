package com.asmrblock.render;

import com.asmrblock.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 완성본 API.
 * POST로 요청 → status가 DONE이 될 때까지 GET으로 확인 (보통 몇 초~수십 초) → fileUrl 재생
 */
@RestController
@RequestMapping("/api/v1/playlists/{playlistId}/render")
@RequiredArgsConstructor
public class RenderController {

    private final RenderService renderService;

    // 완성본 만들기 요청 (로그인 필요)
    @PostMapping
    public ApiResponse<RenderResponse> request(@PathVariable Long playlistId,
                                               @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(renderService.request(playlistId, userId));
    }

    // 상태 확인 (공개 플레이리스트는 비로그인도 가능)
    @GetMapping
    public ApiResponse<RenderResponse> status(@PathVariable Long playlistId,
                                              @AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(renderService.status(playlistId, userId));
    }
}
