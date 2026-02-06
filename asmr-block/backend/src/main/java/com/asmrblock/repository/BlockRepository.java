package com.asmrblock.repository;

import com.asmrblock.domain.Block;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface BlockRepository {
    
    // 블록 등록
    void insert(Block block);
    
    // 블록-태그 연결
    void insertBlockTag(@Param("blockId") Long blockId, @Param("tagId") Long tagId);
    
    // 블록 ID로 조회 (카테고리, 업로더 포함)
    Optional<Block> findById(Long id);
    
    // 블록 목록 조회 (페이징, 필터링)
    List<Block> findAll(
        @Param("categoryId") Long categoryId,
        @Param("tagIds") List<Long> tagIds,
        @Param("keyword") String keyword,
        @Param("status") String status,
        @Param("offset") int offset,
        @Param("limit") int limit,
        @Param("sort") String sort
    );
    
    // 블록 총 개수 조회
    long countAll(
        @Param("categoryId") Long categoryId,
        @Param("tagIds") List<Long> tagIds,
        @Param("keyword") String keyword,
        @Param("status") String status
    );
    
    // 재생 횟수 증가
    void incrementPlayCount(Long id);
    
    // 블록 수정
    void update(Block block);
    
    // 블록-태그 삭제
    void deleteBlockTags(Long blockId);
}
