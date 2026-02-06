package com.asmrblock.service;

import com.asmrblock.domain.SoundCategory;
import com.asmrblock.domain.SoundTag;
import com.asmrblock.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {
    
    private final CategoryRepository categoryRepository;
    
    // 카테고리 전체 조회
    @Transactional(readOnly = true)
    public List<SoundCategory> getAllCategories() {
        return categoryRepository.findAllCategories();
    }
    
    // 태그 전체 조회
    @Transactional(readOnly = true)
    public List<SoundTag> getAllTags() {
        return categoryRepository.findAllTags();
    }
}
