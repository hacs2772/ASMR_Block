package com.asmrblock.block;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Mapper
public interface BlockMapper {

    void insert(Block block);

    void insertTags(@Param("blockId") Long blockId, @Param("tagIds") Collection<Long> tagIds);

    /** 활성화된 블록 (상태 무관) */
    Optional<Block> findById(Long id);

    /** 활성화된 블록 여러 개 (상태 무관) */
    List<Block> findByIds(@Param("ids") Collection<Long> ids);

    List<Block> search(BlockSearchCondition condition);

    long count(BlockSearchCondition condition);

    /** 최근 days일 동안 많이 재생된 순 (recentPlays 채워짐) */
    List<Block> findTrending(@Param("days") int days, @Param("limit") int limit);

    void updateStatus(@Param("id") Long id, @Param("status") BlockStatus status);

    void incrementPlayCount(Long id);

    void updatePrice(@Param("id") Long id, @Param("price") int price);

    void updatePreviewKey(@Param("id") Long id, @Param("previewKey") String previewKey);

    /** 내가 올린 블록 (검수 상태 무관, 활성, 최신순) */
    List<Block> findByUploader(@Param("uploaderId") Long uploaderId, @Param("offset") int offset, @Param("limit") int limit);

    long countByUploader(@Param("uploaderId") Long uploaderId);

    /** 블록마다 담은 사람 수 (올린 사람 본인은 빼고) */
    List<BlockCount> countCollectors(@Param("blockIds") Collection<Long> blockIds);

    /** 맛보기 파일이 아직 없는 유료 블록 (승인·활성) */
    List<Block> findPaidWithoutPreview();
}
