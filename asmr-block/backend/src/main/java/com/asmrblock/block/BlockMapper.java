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

    void updateStatus(@Param("id") Long id, @Param("status") BlockStatus status);

    void incrementPlayCount(Long id);
}
