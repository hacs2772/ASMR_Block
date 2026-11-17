package com.asmrblock.playlist;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Mapper
public interface PlaylistMapper {

    void insert(Playlist playlist);

    /** 담아 온 복사본 저장. 같은 사람이 같은 원본을 이미 담았으면 넣지 않음 (그때 id는 null로 남음) */
    void insertCopy(Playlist playlist);

    /** userId가 sourceIds 중에서 담아 온 복사본 (id, sourcePlaylistId만 채워짐) */
    List<Playlist> findCopies(@Param("userId") Long userId, @Param("sourceIds") Collection<Long> sourceIds);

    void update(Playlist playlist);

    void delete(Long id);

    void deleteByUserId(Long userId);

    /** 작성자 닉네임 포함 (동 정보는 findLayers로 따로) */
    Optional<Playlist> findById(Long id);

    void updateHidden(@org.apache.ibatis.annotations.Param("id") Long id, @org.apache.ibatis.annotations.Param("hidden") boolean hidden);

    void updatePublic(@org.apache.ibatis.annotations.Param("id") Long id, @org.apache.ibatis.annotations.Param("isPublic") boolean isPublic);

    List<Playlist> findByUserId(@Param("userId") Long userId,
                                @Param("offset") int offset, @Param("limit") int limit);

    long countByUserId(Long userId);

    List<Playlist> findPublic(@Param("sort") String sort,
                              @Param("offset") int offset, @Param("limit") int limit);

    long countPublic();

    /** 요즘 뜨는 조합: 최근 days일 재생이 많은 공개 플레이리스트 (recentPlays 채워짐) */
    List<Playlist> findTrending(@Param("days") int days, @Param("limit") int limit);

    void insertLayer(PlaylistLayer layer);

    /** items 순서대로 sort_order 1, 2, 3... (blockId, repeat, startSeconds) */
    void insertLayerBlocks(@Param("layerId") Long layerId, @Param("items") List<PlaylistDtos.ItemRequest> items);

    void deleteLayers(Long playlistId);

    /** 여러 플레이리스트의 동 + 블록 + 카테고리를 쿼리 한 번으로 */
    List<PlaylistLayer> findLayers(@Param("playlistIds") Collection<Long> playlistIds);

    void incrementPlayCount(Long id);

    /** 공개(숨기지 않은) 조합 여러 개 (추천 목록용) */
    List<Playlist> findPublicByIds(@Param("ids") Collection<Long> ids);

    /** 이 사람이 볼 수 있는 조합 여러 개 (내 조합 + 남의 공개·숨기지 않은 조합) */
    List<Playlist> findViewableByIds(@Param("ids") Collection<Long> ids, @Param("userId") Long userId);
}
