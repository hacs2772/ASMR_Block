package com.asmrblock.repository;

import com.asmrblock.domain.Playlist;
import com.asmrblock.domain.PlaylistBlock;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface PlaylistRepository {
    
    // 플레이리스트 등록
    void insert(Playlist playlist);
    
    // 플레이리스트-블록 등록
    void insertPlaylistBlock(PlaylistBlock playlistBlock);
    
    // ID로 조회
    Optional<Playlist> findById(Long id);
    
    // 사용자별 플레이리스트 목록
    List<Playlist> findByUserId(
        @Param("userId") Long userId,
        @Param("offset") int offset,
        @Param("limit") int limit
    );
    
    // 사용자별 플레이리스트 개수
    long countByUserId(Long userId);
    
    // 플레이리스트의 블록 목록 조회
    List<PlaylistBlock> findBlocksByPlaylistId(Long playlistId);
    
    // 플레이리스트 수정
    void update(Playlist playlist);
    
    // 플레이리스트-블록 삭제
    void deletePlaylistBlocks(Long playlistId);
    
    // 플레이리스트 삭제
    void delete(Long id);
    
    // 재생 횟수 증가
    void incrementPlayCount(Long id);
}
