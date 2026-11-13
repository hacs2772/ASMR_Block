package com.asmrblock.playlist;

import com.asmrblock.block.Block;
import com.asmrblock.block.BlockService;
import com.asmrblock.common.ApiException;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.play.PlayCountService;
import com.asmrblock.play.PlayResult;
import com.asmrblock.play.PlayTarget;
import com.asmrblock.playlist.PlaylistDtos.LayerRequest;
import com.asmrblock.playlist.PlaylistDtos.PlaylistSaveRequest;
import com.asmrblock.playlist.PlaylistDtos.PlaylistSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class PlaylistService {

    static final double DEFAULT_MAIN_VOLUME = 1.0;
    static final double DEFAULT_BACKGROUND_VOLUME = 0.5;

    private final PlaylistMapper playlistMapper;
    private final BlockService blockService;
    private final PlayCountService playCountService;

    // ===================== 조회 =====================

    @Transactional(readOnly = true)
    public PageResponse<PlaylistSummaryResponse> listMine(Long userId, PageQuery page) {
        List<Playlist> playlists = playlistMapper.findByUserId(userId, page.offset(), page.size());
        return PageResponse.of(summaries(playlists), page, playlistMapper.countByUserId(userId));
    }

    @Transactional(readOnly = true)
    public PageResponse<PlaylistSummaryResponse> listPublic(String sort, PageQuery page) {
        String order = "popular".equals(sort) ? "popular" : "latest";
        List<Playlist> playlists = playlistMapper.findPublic(order, page.offset(), page.size());
        return PageResponse.of(summaries(playlists), page, playlistMapper.countPublic());
    }

    /** 공개 플레이리스트이거나 내 것이면 동 정보까지 채워서 반환 (userId는 비로그인이면 null) */
    @Transactional(readOnly = true)
    public Playlist getViewable(Long id, Long userId) {
        Playlist playlist = find(id);
        if (!playlist.isViewableBy(userId)) {
            throw ApiException.forbidden("비공개 플레이리스트입니다.");
        }
        loadLayers(List.of(playlist));
        return playlist;
    }

    // ===================== 저장 =====================

    @Transactional
    public Playlist create(Long userId, PlaylistSaveRequest request) {
        Playlist playlist = Playlist.builder().userId(userId).playCount(0).build();
        applyFields(playlist, request);
        playlistMapper.insert(playlist);
        saveLayers(playlist.getId(), request);
        return getViewable(playlist.getId(), userId);
    }

    @Transactional
    public Playlist update(Long id, Long userId, PlaylistSaveRequest request) {
        Playlist playlist = findOwn(id, userId, "수정 권한이 없습니다.");
        applyFields(playlist, request);
        playlistMapper.update(playlist);
        playlistMapper.deleteLayers(id);
        saveLayers(id, request);
        return getViewable(id, userId);
    }

    @Transactional
    public void delete(Long id, Long userId) {
        findOwn(id, userId, "삭제 권한이 없습니다.");
        playlistMapper.delete(id);
    }

    @Transactional
    public void deleteAllOf(Long userId) {
        playlistMapper.deleteByUserId(userId);
    }

    // 재생 기록 (로그인 사용자만, 30분 내 중복 재생은 세지 않음)
    @Transactional
    public PlayResult recordPlay(Long id, Long userId) {
        Playlist playlist = find(id);
        if (!playlist.isViewableBy(userId)) {
            throw ApiException.forbidden("비공개 플레이리스트입니다.");
        }
        boolean counted = playCountService.record(userId, PlayTarget.PLAYLIST, id);
        if (counted) {
            playlistMapper.incrementPlayCount(id);
        }
        return new PlayResult(playlist.getPlayCount() + (counted ? 1 : 0), counted);
    }

    // ===================== 내부 =====================

    /** 제목 등 기본 정보 + 총 재생 시간 계산 (블록 검증 포함) */
    private void applyFields(Playlist playlist, PlaylistSaveRequest request) {
        Map<Long, Block> blocks = blockService.findPlayableByIds(Stream.concat(
                request.main().blockIds().stream(),
                request.background() == null ? Stream.empty() : request.background().blockIds().stream()
        ).collect(Collectors.toSet()));

        int mainDuration = sumDuration(request.main(), blocks);
        int totalDuration = mainDuration;
        if (request.background() != null && !loopOf(request.background())) {
            totalDuration = Math.max(mainDuration, sumDuration(request.background(), blocks));
        }

        playlist.setTitle(request.title().trim());
        playlist.setDescription(request.description());
        playlist.setIsPublic(Boolean.TRUE.equals(request.isPublic()));
        playlist.setTotalDuration(totalDuration);
    }

    private static int sumDuration(LayerRequest layer, Map<Long, Block> blocks) {
        int total = 0;
        for (Long blockId : layer.blockIds()) {
            Block block = blocks.get(blockId);
            if (block == null) {
                throw ApiException.badRequest("사용할 수 없는 블록입니다: " + blockId);
            }
            total += block.getDuration();
        }
        return total;
    }

    private void saveLayers(Long playlistId, PlaylistSaveRequest request) {
        saveLayer(playlistId, LayerRole.MAIN, request.main(), DEFAULT_MAIN_VOLUME, false);
        if (request.background() != null) {
            saveLayer(playlistId, LayerRole.BACKGROUND, request.background(),
                    DEFAULT_BACKGROUND_VOLUME, loopOf(request.background()));
        }
    }

    private void saveLayer(Long playlistId, LayerRole role, LayerRequest request, double defaultVolume, boolean loop) {
        PlaylistLayer layer = PlaylistLayer.builder()
                .playlistId(playlistId)
                .role(role)
                .volume(request.volume() == null ? defaultVolume : request.volume())
                .loopToFill(loop)
                .build();
        playlistMapper.insertLayer(layer);
        playlistMapper.insertLayerBlocks(layer.getId(), request.blockIds());
    }

    private static boolean loopOf(LayerRequest background) {
        return background.loop() == null || background.loop();
    }

    private List<PlaylistSummaryResponse> summaries(List<Playlist> playlists) {
        loadLayers(playlists);
        return playlists.stream().map(PlaylistSummaryResponse::from).toList();
    }

    /** 여러 플레이리스트의 동을 쿼리 한 번으로 채움 */
    private void loadLayers(List<Playlist> playlists) {
        if (playlists.isEmpty()) {
            return;
        }
        Map<Long, List<PlaylistLayer>> layers = playlistMapper
                .findLayers(playlists.stream().map(Playlist::getId).toList()).stream()
                .collect(Collectors.groupingBy(PlaylistLayer::getPlaylistId));
        playlists.forEach(p -> p.setLayers(layers.getOrDefault(p.getId(), List.of())));
    }

    private Playlist find(Long id) {
        return playlistMapper.findById(id)
                .orElseThrow(() -> ApiException.notFound("플레이리스트를 찾을 수 없습니다."));
    }

    private Playlist findOwn(Long id, Long userId, String forbiddenMessage) {
        Playlist playlist = find(id);
        if (!playlist.getUserId().equals(userId)) {
            throw ApiException.forbidden(forbiddenMessage);
        }
        return playlist;
    }
}
