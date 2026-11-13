package com.asmrblock.service;

import com.asmrblock.domain.Block;
import com.asmrblock.domain.Playlist;
import com.asmrblock.domain.PlaylistBlock;
import com.asmrblock.dto.request.PlaylistCreateRequest;
import com.asmrblock.exception.CustomException;
import com.asmrblock.repository.BlockRepository;
import com.asmrblock.repository.PlaylistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlaylistService {

    private final PlaylistRepository playlistRepository;
    private final BlockRepository blockRepository;
    private final PlayCountService playCountService;

    // 내 플레이리스트 목록 조회
    @Transactional(readOnly = true)
    public List<Playlist> getMyPlaylists(Long userId, int page, int size) {
        int offset = page * size;
        List<Playlist> playlists = playlistRepository.findByUserId(userId, offset, size);

        // TODO: 플레이리스트가 많아지면 블록을 한 번에 조회하도록 개선
        playlists.forEach(playlist ->
                playlist.setBlocks(playlistRepository.findBlocksByPlaylistId(playlist.getId())));
        return playlists;
    }

    @Transactional(readOnly = true)
    public long countMyPlaylists(Long userId) {
        return playlistRepository.countByUserId(userId);
    }

    // 플레이리스트 상세 조회 (공개 플레이리스트는 비로그인도 가능, userId == null)
    @Transactional(readOnly = true)
    public Playlist getPlaylist(Long id, Long userId) {
        Playlist playlist = findViewablePlaylist(id, userId);
        List<PlaylistBlock> blocks = playlistRepository.findBlocksByPlaylistId(id);
        playlist.setBlocks(blocks);
        return playlist;
    }

    // 플레이리스트 생성
    @Transactional
    public Playlist createPlaylist(Long userId, PlaylistCreateRequest request) {
        List<Long> blockIds = blockIdsOf(request);
        int totalDuration = validateBlocksAndSumDuration(blockIds);

        Playlist playlist = Playlist.builder()
                .userId(userId)
                .title(request.getTitle())
                .description(request.getDescription())
                .totalDuration(totalDuration)
                .isPublic(Boolean.TRUE.equals(request.getIsPublic()))
                .playCount(0)
                .build();

        playlistRepository.insert(playlist);
        playlistRepository.insertPlaylistBlocks(playlist.getId(), blockIds);
        return playlist;
    }

    // 플레이리스트 수정
    @Transactional
    public Playlist updatePlaylist(Long id, Long userId, PlaylistCreateRequest request) {
        Playlist playlist = findOwnPlaylist(id, userId, "수정 권한이 없습니다.");

        List<Long> blockIds = blockIdsOf(request);
        playlist.setTitle(request.getTitle());
        playlist.setDescription(request.getDescription());
        playlist.setTotalDuration(validateBlocksAndSumDuration(blockIds));
        playlist.setIsPublic(Boolean.TRUE.equals(request.getIsPublic()));
        playlistRepository.update(playlist);

        // 기존 블록 삭제 후 새로 연결
        playlistRepository.deletePlaylistBlocks(id);
        playlistRepository.insertPlaylistBlocks(id, blockIds);
        return playlist;
    }

    // 플레이리스트 삭제
    @Transactional
    public void deletePlaylist(Long id, Long userId) {
        findOwnPlaylist(id, userId, "삭제 권한이 없습니다.");
        playlistRepository.deletePlaylistBlocks(id);
        playlistRepository.delete(id);
    }

    // 재생 기록 (로그인 사용자만, 30분 내 중복 재생은 세지 않음)
    @Transactional
    public BlockService.PlayResult recordPlay(Long id, Long userId) {
        Playlist playlist = findViewablePlaylist(id, userId);
        boolean counted = playCountService.record(userId, PlayCountService.PLAYLIST, id);
        if (counted) {
            playlistRepository.incrementPlayCount(id);
        }
        return new BlockService.PlayResult(playlist.getPlayCount() + (counted ? 1 : 0), counted);
    }

    private Playlist findViewablePlaylist(Long id, Long userId) {
        Playlist playlist = playlistRepository.findById(id)
                .orElseThrow(() -> CustomException.notFound("플레이리스트를 찾을 수 없습니다."));
        boolean isOwner = playlist.getUserId().equals(userId);
        if (!playlist.getIsPublic() && !isOwner) {
            throw CustomException.forbidden("비공개 플레이리스트입니다.");
        }
        return playlist;
    }

    private Playlist findOwnPlaylist(Long id, Long userId, String forbiddenMessage) {
        Playlist playlist = playlistRepository.findById(id)
                .orElseThrow(() -> CustomException.notFound("플레이리스트를 찾을 수 없습니다."));
        if (!playlist.getUserId().equals(userId)) {
            throw CustomException.forbidden(forbiddenMessage);
        }
        return playlist;
    }

    private static List<Long> blockIdsOf(PlaylistCreateRequest request) {
        return request.getBlocks().stream()
                .map(PlaylistCreateRequest.BlockItem::getBlockId)
                .toList();
    }

    /** 승인된 블록만 넣을 수 있음. 같은 블록 반복 가능. 총 재생 시간(초)을 돌려줍니다. */
    private int validateBlocksAndSumDuration(List<Long> blockIds) {
        Map<Long, Block> blocks = blockRepository.findAllByIds(blockIds.stream().distinct().toList())
                .stream()
                .collect(Collectors.toMap(Block::getId, Function.identity()));

        int total = 0;
        for (Long blockId : blockIds) {
            Block block = blocks.get(blockId);
            if (block == null || !BlockService.STATUS_APPROVED.equals(block.getStatus())) {
                throw CustomException.badRequest("사용할 수 없는 블록입니다: " + blockId);
            }
            total += block.getDuration();
        }
        return total;
    }
}
