package com.asmrblock.category;

import com.asmrblock.category.CategoryDtos.CategoryResponse;
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

    @GetMapping("/categories")
    public ApiResponse<List<CategoryResponse>> getCategories() {
        return ApiResponse.ok(categoryService.getCategories().stream().map(CategoryResponse::from).toList());
    }

    @GetMapping("/tags")
    public ApiResponse<List<TagResponse>> getTags() {
        return ApiResponse.ok(categoryService.getTags().stream()
                .map(tag -> new TagResponse(tag.getId(), tag.getName())).toList());
    }
}
