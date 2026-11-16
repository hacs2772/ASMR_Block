package com.asmrblock.playlist;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.play.PlayResult;
import com.asmrblock.playlist.PlaylistDtos.ListenedRequest;
import com.asmrblock.playlist.PlaylistDtos.ListenedResponse;
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

import java.util.List;

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
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(playlistService.listPublic(sort, PageQuery.of(page, size), userId));
    }

    // 요즘 뜨는 조합 (최근 7일 재생이 많은 공개 조합)
    @GetMapping("/trending")
    public ApiResponse<List<PlaylistSummaryResponse>> trending(@AuthenticationPrincipal Long userId,
                                                               @RequestParam(defaultValue = "7") int days,
                                                               @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(playlistService.trending(days, size, userId));
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

    // 조합 한 번에 담기: 블록은 내 블록함에, 조합은 내 조합(비공개)으로 복사 (로그인 필요)
    @PostMapping("/{playlistId}/collect")
    public ApiResponse<PlaylistDetailResponse> collect(@AuthenticationPrincipal Long userId,
                                                       @PathVariable Long playlistId) {
        return ApiResponse.ok("내 조합에 담았어요.", detail(playlistService.collect(playlistId, userId), userId));
    }

    // 재생 기록 (로그인 필요)
    @PostMapping("/{playlistId}/play")
    public ApiResponse<PlayResult> recordPlay(@AuthenticationPrincipal Long userId,
                                              @PathVariable Long playlistId) {
        return ApiResponse.ok(playlistService.recordPlay(playlistId, userId));
    }

    // 오래 들음 기록 (로그인 필요): 듣기 화면이 10분 넘게 재생하면 한 번 → 관리자 통계 "잠들 때까지 들었는지"
    @PostMapping("/{playlistId}/listened")
    public ApiResponse<ListenedResponse> recordListened(@AuthenticationPrincipal Long userId,
                                                        @PathVariable Long playlistId,
                                                        @Valid @RequestBody ListenedRequest request) {
        return ApiResponse.ok(new ListenedResponse(playlistService.recordListened(playlistId, userId, request.minutes())));
    }

    private PlaylistDetailResponse detail(Playlist playlist, Long viewerId) {
        return PlaylistDetailResponse.from(playlist, renderService.statusOf(playlist), storageService,
                playlistService.ownedBlockIds(playlist, viewerId),
                playlistService.collectedIds(viewerId, List.of(playlist.getId())).get(playlist.getId()));
    }
}
