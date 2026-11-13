package com.asmrblock.playlist;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.play.PlayResult;
import com.asmrblock.playlist.PlaylistDtos.PlaylistDetailResponse;
import com.asmrblock.playlist.PlaylistDtos.PlaylistSaveRequest;
import com.asmrblock.playlist.PlaylistDtos.PlaylistSummaryResponse;
import com.asmrblock.render.RenderService;
import com.asmrblock.storage.StorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/playlists")
@RequiredArgsConstructor
public class PlaylistController {

    private final PlaylistService playlistService;
    private final RenderService renderService;
    private final StorageService storageService;

    // 내 플레이리스트
    @GetMapping
    public ApiResponse<PageResponse<PlaylistSummaryResponse>> listMine(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(playlistService.listMine(userId, PageQuery.of(page, size)));
    }

    // 공개 플레이리스트 둘러보기 (sort=latest|popular)
    @GetMapping("/public")
    public ApiResponse<PageResponse<PlaylistSummaryResponse>> listPublic(
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(playlistService.listPublic(sort, PageQuery.of(page, size)));
    }

    // 상세 (공개 플레이리스트는 로그인 없이도 가능 → userId가 null일 수 있음)
    @GetMapping("/{playlistId}")
    public ApiResponse<PlaylistDetailResponse> get(@AuthenticationPrincipal Long userId,
                                                   @PathVariable Long playlistId) {
        return ApiResponse.ok(detail(playlistService.getViewable(playlistId, userId), userId));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PlaylistDetailResponse> create(@AuthenticationPrincipal Long userId,
                                                      @Valid @RequestBody PlaylistSaveRequest request) {
        return ApiResponse.ok("플레이리스트가 생성되었습니다.", detail(playlistService.create(userId, request), userId));
    }

    @PutMapping("/{playlistId}")
    public ApiResponse<PlaylistDetailResponse> update(@AuthenticationPrincipal Long userId,
                                                      @PathVariable Long playlistId,
                                                      @Valid @RequestBody PlaylistSaveRequest request) {
        return ApiResponse.ok("플레이리스트가 수정되었습니다.",
                detail(playlistService.update(playlistId, userId, request), userId));
    }

    @DeleteMapping("/{playlistId}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal Long userId, @PathVariable Long playlistId) {
        playlistService.delete(playlistId, userId);
        return ApiResponse.message("플레이리스트가 삭제되었습니다.");
    }

    // 재생 기록 (로그인 필요)
    @PostMapping("/{playlistId}/play")
    public ApiResponse<PlayResult> recordPlay(@AuthenticationPrincipal Long userId,
                                              @PathVariable Long playlistId) {
        return ApiResponse.ok(playlistService.recordPlay(playlistId, userId));
    }

    private PlaylistDetailResponse detail(Playlist playlist, Long viewerId) {
        return PlaylistDetailResponse.from(playlist, renderService.statusOf(playlist), storageService,
                playlistService.ownedBlockIds(playlist, viewerId));
    }
}
