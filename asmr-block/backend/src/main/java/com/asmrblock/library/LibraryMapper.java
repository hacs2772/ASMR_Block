package com.asmrblock.library;

import com.asmrblock.block.Block;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Mapper
public interface LibraryMapper {

    /** 이미 담겨 있으면 아무것도 하지 않음 */
    void insert(@Param("userId") Long userId, @Param("blockId") Long blockId, @Param("source") LibrarySource source);

    void delete(@Param("userId") Long userId, @Param("blockId") Long blockId);

    Optional<LibrarySource> findSource(@Param("userId") Long userId, @Param("blockId") Long blockId);

    /** blockIds 중 내 블록함에 있는 것만 */
    List<Long> findOwnedIds(@Param("userId") Long userId, @Param("blockIds") Collection<Long> blockIds);

    /** 내 블록함 (승인·활성 블록만, 최근에 담은 순) */
    List<Block> findBlocks(@Param("userId") Long userId);
}
