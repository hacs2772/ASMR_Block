package com.asmrblock.playlist;

import com.asmrblock.block.Block;
import com.asmrblock.block.BlockService;
import com.asmrblock.common.ApiException;
import com.asmrblock.common.PageQuery;
import com.asmrblock.common.PageResponse;
import com.asmrblock.library.LibraryService;
import com.asmrblock.play.PlayCountService;
import com.asmrblock.play.PlayResult;
import com.asmrblock.play.PlayTarget;
import com.asmrblock.playlist.PlaylistDtos.ItemRequest;
import com.asmrblock.playlist.PlaylistDtos.PlaylistSaveRequest;
import com.asmrblock.playlist.PlaylistDtos.TrackRequest;
import com.asmrblock.playlist.PlaylistDtos.PlaylistSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class PlaylistService {

    static final double DEFAULT_MAIN_VOLUME = 1.0;
    static final double DEFAULT_MIX_VOLUME = 0.5;

    private final PlaylistMapper playlistMapper;
    private final BlockService blockService;
    private final PlayCountService playCountService;
    private final LibraryService libraryService;

    // ===================== 조회 =====================

    @Transactional(readOnly = true)
    public PageResponse<PlaylistSummaryResponse> listMine(Long userId, PageQuery page) {
        List<Playlist> playlists = playlistMapper.findByUserId(userId, page.offset(), page.size());
        return PageResponse.of(summaries(playlists, userId), page, playlistMapper.countByUserId(userId));
    }

    /** 공개 조합 (viewerId: 보는 사람, 비로그인이면 null → 이미 담았는지·잠긴 유료 블록 수 계산에 씀) */
    @Transactional(readOnly = true)
    public PageResponse<PlaylistSummaryResponse> listPublic(String sort, PageQuery page, Long viewerId) {
        String order = "popular".equals(sort) ? "popular" : "latest";
        List<Playlist> playlists = playlistMapper.findPublic(order, page.offset(), page.size());
        return PageResponse.of(summaries(playlists, viewerId), page, playlistMapper.countPublic());
    }

    /** 요즘 뜨는 조합 (최근 days일 재생 수 기준, 공개만) */
    @Transactional(readOnly = true)
    public List<PlaylistSummaryResponse> trending(int days, int size, Long viewerId) {
        int limit = Math.min(Math.max(size, 1), 50);
        List<Playlist> playlists = new ArrayList<>(playlistMapper.findTrending(Math.min(Math.max(days, 1), 30), limit));
        // 재생 기록이 모자라면(막 연 사이트) 많이 들은 순 → 새로 올라온 순 공개 조합으로 채움
        if (playlists.size() < limit) {
            Set<Long> shown = playlists.stream().map(Playlist::getId).collect(Collectors.toSet());
            playlistMapper.findPublic("popular", 0, limit + playlists.size()).stream()
                    .filter(p -> !shown.contains(p.getId()))
                    .limit(limit - playlists.size()).forEach(playlists::add);
        }
        return summaries(playlists, viewerId);
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
        applyFields(userId, playlist, request);
        playlistMapper.insert(playlist);
        saveLayers(playlist.getId(), request);
        return getViewable(playlist.getId(), userId);
    }

    @Transactional
    public Playlist update(Long id, Long userId, PlaylistSaveRequest request) {
        Playlist playlist = findOwn(id, userId, "수정 권한이 없습니다.");
        applyFields(userId, playlist, request);
        playlistMapper.update(playlist);
        playlistMapper.deleteLayers(id);
        saveLayers(id, request);
        return getViewable(id, userId);
    }

    /**
     * 조합 한 번에 담기: 남의 공개 조합의 블록을 내 블록함에 넣고, 조합을 내 조합(비공개)으로 복사.
     * 아직 갖지 않은 유료 블록이 있으면 담을 수 없음 (코인 구매가 열리면 그 블록 값만 내고 담게 됨).
     * 이미 담은 조합이면 그 복사본을 그대로 돌려줌.
     */
    @Transactional
    public Playlist collect(Long id, Long userId) {
        Playlist source = getViewable(id, userId);
        if (source.getUserId().equals(userId)) {
            throw ApiException.badRequest("내가 만든 조합이에요.");
        }
        Long existing = collectedIds(userId, List.of(id)).get(id);
        if (existing != null) {
            return getViewable(existing, userId);
        }

        List<Block> blocks = source.distinctBlocks();
        if (blocks.stream().anyMatch(b -> !b.isPlayable())) {
            throw ApiException.badRequest("지금은 들을 수 없는 블록이 있어서 담을 수 없어요.");
        }
        Set<Long> owned = libraryService.ownedIds(userId, blocks.stream().map(Block::getId).toList());
        int locked = source.lockedCount(owned);
        if (locked > 0) {
            throw ApiException.paymentRequired("유료 블록이 " + locked + "개 들어 있어요. 코인 구매가 열리면 담을 수 있어요.");
        }
        libraryService.addFree(userId, blocks.stream().map(Block::getId).filter(b -> !owned.contains(b)).toList());

        Playlist copy = Playlist.builder()
                .userId(userId).title(source.getTitle()).description(source.getDescription())
                .totalDuration(source.getTotalDuration()).isPublic(false).listenMinutes(source.getListenMinutes())
                .playCount(0).sourcePlaylistId(source.getId())
                .build();
        playlistMapper.insertCopy(copy);
        if (copy.getId() == null) {
            // 동시에 두 번 누른 경우: 먼저 만들어진 복사본을 돌려줌
            return getViewable(collectedIds(userId, List.of(id)).get(id), userId);
        }
        for (PlaylistLayer layer : source.getLayers()) {
            PlaylistLayer copied = PlaylistLayer.builder()
                    .playlistId(copy.getId()).role(layer.getRole()).volume(layer.getVolume()).build();
            playlistMapper.insertLayer(copied);
            playlistMapper.insertLayerBlocks(copied.getId(), layer.getBlocks().stream()
                    .map(pb -> new ItemRequest(pb.getBlock().getId(), pb.getRepeatCount(),
                            layer.getRole() == LayerRole.MIX ? pb.getStartSeconds() : null))
                    .toList());
        }
        return getViewable(copy.getId(), userId);
    }

    /** viewerId가 담아 온 복사본 id (원본 id → 복사본 id). 비로그인이면 빈 맵 */
    @Transactional(readOnly = true)
    public Map<Long, Long> collectedIds(Long viewerId, Collection<Long> sourceIds) {
        if (viewerId == null || sourceIds.isEmpty()) {
            return Map.of();
        }
        return playlistMapper.findCopies(viewerId, sourceIds).stream()
                .collect(Collectors.toMap(Playlist::getSourcePlaylistId, Playlist::getId));
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

    /** 보는 사람의 블록함에 있는 블록 id (유료 블록 원본 주소를 보여줄지 판단) */
    @Transactional(readOnly = true)
    public Set<Long> ownedBlockIds(Playlist playlist, Long viewerId) {
        return libraryService.ownedIds(viewerId, playlist.getLayers().stream()
                .flatMap(layer -> layer.getBlocks().stream())
                .map(pb -> pb.getBlock().getId())
                .collect(Collectors.toSet()));
    }

    /** 제목 등 기본 정보 + 총 재생 시간 계산 (블록 검증 포함) */
    private void applyFields(Long userId, Playlist playlist, PlaylistSaveRequest request) {
        Set<Long> blockIds = Stream.concat(
                request.main().items().stream(),
                request.mix() == null ? Stream.empty() : request.mix().items().stream()
        ).map(ItemRequest::blockId).collect(Collectors.toSet());
        Map<Long, Block> blocks = blockService.findPlayableByIds(blockIds);

        // 편집기에서는 내 블록함에 담은 블록만 쓸 수 있음
        Set<Long> owned = libraryService.ownedIds(userId, blocks.keySet());
        if (blocks.keySet().stream().anyMatch(id -> !owned.contains(id))) {
            throw ApiException.badRequest("내 블록함에 없는 블록이 있어요. 블록 상점에서 먼저 담아주세요.");
        }

        int mainDuration = 0;
        for (ItemRequest item : request.main().items()) {
            mainDuration += lengthOf(item, blocks);
        }
        int mixEnd = request.mix() == null ? 0 : validateMixAndGetEnd(request.mix(), blocks);

        int total = Math.max(mainDuration, mixEnd);
        if (total > PlaylistDtos.MAX_TOTAL_SECONDS) {
            throw ApiException.badRequest("전체 길이는 최대 10시간까지 만들 수 있어요.");
        }

        playlist.setTitle(request.title().trim());
        playlist.setDescription(request.description());
        playlist.setIsPublic(Boolean.TRUE.equals(request.isPublic()));
        playlist.setListenMinutes(request.listenMinutes() == null ? 0 : request.listenMinutes());
        playlist.setTotalDuration(total);
    }

    /** 믹스 트랙: 시작 시간 필수, 블록끼리 겹치면 안 됨. 마지막 블록이 끝나는 시각을 돌려줌 */
    private static int validateMixAndGetEnd(TrackRequest mix, Map<Long, Block> blocks) {
        List<ItemRequest> sorted = mix.items().stream()
                .peek(item -> {
                    if (item.startSeconds() == null) {
                        throw ApiException.badRequest("믹스 트랙의 블록에는 시작 시간(startSeconds)이 필요해요.");
                    }
                })
                .sorted(Comparator.comparingInt(ItemRequest::startSeconds))
                .toList();
        int previousEnd = 0;
        for (ItemRequest item : sorted) {
            if (item.startSeconds() < previousEnd) {
                throw ApiException.badRequest("믹스 트랙의 블록끼리 겹쳐요. 위치를 조정해주세요.");
            }
            previousEnd = item.startSeconds() + lengthOf(item, blocks);
        }
        return previousEnd;
    }

    private static int lengthOf(ItemRequest item, Map<Long, Block> blocks) {
        Block block = blocks.get(item.blockId());
        if (block == null) {
            throw ApiException.badRequest("사용할 수 없는 블록입니다: " + item.blockId());
        }
        return block.getDuration() * item.repeatOrOne();
    }

    private void saveLayers(Long playlistId, PlaylistSaveRequest request) {
        // 메인 트랙은 순서대로 이어지므로 시작 시간을 저장하지 않음
        List<ItemRequest> mainItems = request.main().items().stream()
                .map(i -> new ItemRequest(i.blockId(), i.repeatOrOne(), null)).toList();
        saveLayer(playlistId, LayerRole.MAIN, request.main().volume(), DEFAULT_MAIN_VOLUME, mainItems);

        if (request.mix() != null) {
            List<ItemRequest> mixItems = request.mix().items().stream()
                    .map(i -> new ItemRequest(i.blockId(), i.repeatOrOne(), i.startSeconds()))
                    .sorted(Comparator.comparingInt(ItemRequest::startSeconds))
                    .toList();
            saveLayer(playlistId, LayerRole.MIX, request.mix().volume(), DEFAULT_MIX_VOLUME, mixItems);
        }
    }

    private void saveLayer(Long playlistId, LayerRole role, Double volume, double defaultVolume, List<ItemRequest> items) {
        PlaylistLayer layer = PlaylistLayer.builder()
                .playlistId(playlistId)
                .role(role)
                .volume(volume == null ? defaultVolume : volume)
                .build();
        playlistMapper.insertLayer(layer);
        playlistMapper.insertLayerBlocks(layer.getId(), items);
    }

    /** 목록 요약: 동 정보 + 보는 사람이 이미 담았는지 + 잠긴 유료 블록 수 (모두 쿼리 몇 번으로) */
    private List<PlaylistSummaryResponse> summaries(List<Playlist> playlists, Long viewerId) {
        loadLayers(playlists);
        Map<Long, Long> collected = collectedIds(viewerId, playlists.stream().map(Playlist::getId).toList());
        Set<Long> owned = libraryService.ownedIds(viewerId, playlists.stream()
                .flatMap(p -> p.distinctBlocks().stream()).map(Block::getId).collect(Collectors.toSet()));
        return playlists.stream()
                .map(p -> PlaylistSummaryResponse.from(p, collected.get(p.getId()), p.lockedCount(owned)))
                .toList();
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
