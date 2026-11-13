package com.asmrblock.category;

import com.asmrblock.category.CategoryDtos.CategoryTreeResponse;
import com.asmrblock.category.CategoryDtos.TagResponse;
import com.asmrblock.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    // 메뉴 트리 (대분류 > 소분류)
    @GetMapping("/categories")
    public ApiResponse<List<CategoryTreeResponse>> getCategories() {
        return ApiResponse.ok(categoryService.getCategoryTree());
    }

    @GetMapping("/tags")
    public ApiResponse<List<TagResponse>> getTags() {
        return ApiResponse.ok(categoryService.getTags().stream()
                .map(tag -> new TagResponse(tag.getId(), tag.getName())).toList());
    }
}
