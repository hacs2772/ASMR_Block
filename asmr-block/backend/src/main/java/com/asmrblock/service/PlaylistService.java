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

@Service
@RequiredArgsConstructor
public class PlaylistService {
    
    private final PlaylistRepository playlistRepository;
    private final BlockRepository blockRepository;
    
    // 내 플레이리스트 목록 조회
    @Transactional(readOnly = true)
    public List<Playlist> getMyPlaylists(Long userId, int page, int size) {
        int offset = page * size;
        List<Playlist> playlists = playlistRepository.findByUserId(userId, offset, size);
        
        // 각 플레이리스트의 블록 정보 로드
        playlists.forEach(playlist -> {
            List<PlaylistBlock> blocks = playlistRepository.findBlocksByPlaylistId(playlist.getId());
            playlist.setBlocks(blocks);
        });
        
        return playlists;
    }
    
    // 플레이리스트 개수 조회
    @Transactional(readOnly = true)
    public long countMyPlaylists(Long userId) {
        return playlistRepository.countByUserId(userId);
    }
    
    // 플레이리스트 상세 조회
    @Transactional(readOnly = true)
    public Playlist getPlaylist(Long id, Long userId) {
        Playlist playlist = playlistRepository.findById(id)
                .orElseThrow(() -> CustomException.notFound("플레이리스트를 찾을 수 없습니다."));
        
        // 비공개인 경우 본인만 조회 가능
        if (!playlist.getIsPublic() && !playlist.getUserId().equals(userId)) {
            throw CustomException.forbidden("접근 권한이 없습니다.");
        }
        
        // 블록 목록 로드
        List<PlaylistBlock> blocks = playlistRepository.findBlocksByPlaylistId(id);
        playlist.setBlocks(blocks);
        
        return playlist;
    }
    
    // 플레이리스트 생성
    @Transactional
    public Playlist createPlaylist(Long userId, PlaylistCreateRequest request) {
        // 총 재생 시간 계산
        int totalDuration = 0;
        for (PlaylistCreateRequest.BlockItem item : request.getBlocks()) {
            Block block = blockRepository.findById(item.getBlockId())
                    .orElseThrow(() -> CustomException.notFound("블록을 찾을 수 없습니다: " + item.getBlockId()));
            totalDuration += block.getDuration();
        }
        
        // 플레이리스트 생성
        Playlist playlist = Playlist.builder()
                .userId(userId)
                .title(request.getTitle())
                .description(request.getDescription())
                .totalDuration(totalDuration)
                .isPublic(request.getIsPublic() != null ? request.getIsPublic() : false)
                .playCount(0)
                .build();
        
        playlistRepository.insert(playlist);
        
        // 블록 연결
        for (PlaylistCreateRequest.BlockItem item : request.getBlocks()) {
            PlaylistBlock playlistBlock = PlaylistBlock.builder()
                    .playlistId(playlist.getId())
                    .blockId(item.getBlockId())
                    .sortOrder(item.getSortOrder())
                    .build();
            playlistRepository.insertPlaylistBlock(playlistBlock);
        }
        
        return playlist;
    }
    
    // 플레이리스트 수정
    @Transactional
    public Playlist updatePlaylist(Long id, Long userId, PlaylistCreateRequest request) {
        Playlist playlist = playlistRepository.findById(id)
                .orElseThrow(() -> CustomException.notFound("플레이리스트를 찾을 수 없습니다."));
        
        // 본인 것만 수정 가능
        if (!playlist.getUserId().equals(userId)) {
            throw CustomException.forbidden("수정 권한이 없습니다.");
        }
        
        // 총 재생 시간 재계산
        int totalDuration = 0;
        for (PlaylistCreateRequest.BlockItem item : request.getBlocks()) {
            Block block = blockRepository.findById(item.getBlockId())
                    .orElseThrow(() -> CustomException.notFound("블록을 찾을 수 없습니다: " + item.getBlockId()));
            totalDuration += block.getDuration();
        }
        
        // 플레이리스트 수정
        playlist.setTitle(request.getTitle());
        playlist.setDescription(request.getDescription());
        playlist.setTotalDuration(totalDuration);
        playlist.setIsPublic(request.getIsPublic() != null ? request.getIsPublic() : false);
        
        playlistRepository.update(playlist);
        
        // 기존 블록 삭제 후 새로 연결
        playlistRepository.deletePlaylistBlocks(id);
        
        for (PlaylistCreateRequest.BlockItem item : request.getBlocks()) {
            PlaylistBlock playlistBlock = PlaylistBlock.builder()
                    .playlistId(id)
                    .blockId(item.getBlockId())
                    .sortOrder(item.getSortOrder())
                    .build();
            playlistRepository.insertPlaylistBlock(playlistBlock);
        }
        
        return playlist;
    }
    
    // 플레이리스트 삭제
    @Transactional
    public void deletePlaylist(Long id, Long userId) {
        Playlist playlist = playlistRepository.findById(id)
                .orElseThrow(() -> CustomException.notFound("플레이리스트를 찾을 수 없습니다."));
        
        // 본인 것만 삭제 가능
        if (!playlist.getUserId().equals(userId)) {
            throw CustomException.forbidden("삭제 권한이 없습니다.");
        }
        
        playlistRepository.deletePlaylistBlocks(id);
        playlistRepository.delete(id);
    }
    
    // 재생 횟수 증가
    @Transactional
    public int incrementPlayCount(Long id) {
        Playlist playlist = playlistRepository.findById(id)
                .orElseThrow(() -> CustomException.notFound("플레이리스트를 찾을 수 없습니다."));
        
        playlistRepository.incrementPlayCount(id);
        
        return playlist.getPlayCount() + 1;
    }
}
