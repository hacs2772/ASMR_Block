package com.asmrblock.controller;

import com.asmrblock.domain.SoundCategory;
import com.asmrblock.domain.SoundTag;
import com.asmrblock.dto.response.ApiResponse;
import com.asmrblock.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CategoryController {
    
    private final CategoryService categoryService;
    
    // 카테고리 목록 조회
    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<SoundCategory>>> getCategories() {
        List<SoundCategory> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success(categories));
    }
    
    // 태그 목록 조회
    @GetMapping("/tags")
    public ResponseEntity<ApiResponse<List<SoundTag>>> getTags() {
        List<SoundTag> tags = categoryService.getAllTags();
        return ResponseEntity.ok(ApiResponse.success(tags));
    }
}
