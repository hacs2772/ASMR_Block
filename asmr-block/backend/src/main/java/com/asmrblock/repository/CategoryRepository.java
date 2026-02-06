package com.asmrblock.repository;

import com.asmrblock.domain.SoundCategory;
import com.asmrblock.domain.SoundTag;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import java.util.Optional;

@Mapper
public interface CategoryRepository {
    
    // 카테고리 전체 조회 (활성화된 것만)
    List<SoundCategory> findAllCategories();
    
    // 카테고리 ID로 조회
    Optional<SoundCategory> findCategoryById(Long id);
    
    // 태그 전체 조회 (활성화된 것만)
    List<SoundTag> findAllTags();
    
    // 태그 ID로 조회
    Optional<SoundTag> findTagById(Long id);
    
    // 블록 ID로 태그 목록 조회
    List<SoundTag> findTagsByBlockId(Long blockId);
}
