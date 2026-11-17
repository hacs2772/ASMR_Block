package com.asmrblock.tonight;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.playlist.PlaylistDtos.PlaylistDetailResponse;
import com.asmrblock.playlist.PlaylistService;
import com.asmrblock.render.RenderService;
import com.asmrblock.storage.StorageService;
import com.asmrblock.tonight.TonightDtos.TonightInfo;
import com.asmrblock.tonight.TonightDtos.TonightRequest;
import com.asmrblock.tonight.TonightDtos.TonightResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 오늘 밤 조합: 한 줄(선택) → AI 또는 규칙으로 트리거를 정해 두 줄 조합을 쌓고 완성본까지 바로 시작 → 앱·웹은 듣기 화면으로
 */
@RestController
@RequestMapping("/api/v1/playlists/tonight")
@RequiredArgsConstructor
public class TonightController {

    private final TonightService tonightService;
    private final PlaylistService playlistService;
    private final RenderService renderService;
    private final StorageService storageService;

    // 화면 안내 (로그인 없이도): AI가 켜졌는지, 한 줄 최대 글자, 오늘 남은 AI 횟수
    @GetMapping
    public ApiResponse<TonightInfo> info(@AuthenticationPrincipal Long userId) {
        return ApiResponse.ok(tonightService.info(userId));
    }

    // 만들기 (로그인 필요)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TonightResponse> make(@AuthenticationPrincipal Long userId,
                                             @Valid @RequestBody TonightRequest request) {
        TonightService.Result r = tonightService.make(userId, request);
        PlaylistDetailResponse detail = PlaylistDetailResponse.from(r.playlist(), renderService.statusOf(r.playlist()),
                storageService, playlistService.ownedBlockIds(r.playlist(), userId),
                playlistService.collectedIds(userId, List.of(r.playlist().getId())).get(r.playlist().getId()));
        return ApiResponse.ok("오늘 밤 조합을 쌓았어요.",
                new TonightResponse(detail, r.source().name(), r.note(), r.main(), r.layer()));
    }
}
