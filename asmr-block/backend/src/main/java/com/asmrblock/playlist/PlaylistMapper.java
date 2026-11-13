package com.asmrblock.playlist;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Mapper
public interface PlaylistMapper {

    void insert(Playlist playlist);

    void update(Playlist playlist);

    void delete(Long id);

    void deleteByUserId(Long userId);

    /** 작성자 닉네임 포함 (동 정보는 findLayers로 따로) */
    Optional<Playlist> findById(Long id);

    List<Playlist> findByUserId(@Param("userId") Long userId,
                                @Param("offset") int offset, @Param("limit") int limit);

    long countByUserId(Long userId);

    List<Playlist> findPublic(@Param("sort") String sort,
                              @Param("offset") int offset, @Param("limit") int limit);

    long countPublic();

    void insertLayer(PlaylistLayer layer);

    /** blockIds 순서대로 sort_order 1, 2, 3... */
    void insertLayerBlocks(@Param("layerId") Long layerId, @Param("blockIds") List<Long> blockIds);

    void deleteLayers(Long playlistId);

    /** 여러 플레이리스트의 동 + 블록 + 카테고리를 쿼리 한 번으로 */
    List<PlaylistLayer> findLayers(@Param("playlistIds") Collection<Long> playlistIds);

    void incrementPlayCount(Long id);
}
