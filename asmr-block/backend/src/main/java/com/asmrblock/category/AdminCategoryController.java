package com.asmrblock.category;

import com.asmrblock.category.CategoryDtos.AdminCategoryResponse;
import com.asmrblock.category.CategoryDtos.CategoryCreateRequest;
import com.asmrblock.category.CategoryDtos.CategoryOrderRequest;
import com.asmrblock.category.CategoryDtos.CategoryUpdateRequest;
import com.asmrblock.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 관리자: 트리거 종류 추가·고치기·숨기기·순서 (SecurityConfig에서 ADMIN 권한 확인). 응답은 항상 바뀐 뒤의 전체 트리 */
@RestController
@RequestMapping("/api/v1/admin/categories")
@RequiredArgsConstructor
public class AdminCategoryController {

    private final AdminCategoryService adminCategoryService;

    @GetMapping
    public ApiResponse<List<AdminCategoryResponse>> tree() {
        return ApiResponse.ok(adminCategoryService.tree());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<List<AdminCategoryResponse>> create(@Valid @RequestBody CategoryCreateRequest request) {
        return ApiResponse.ok("추가했어요.", adminCategoryService.create(request));
    }

    @PatchMapping("/{id}")
    public ApiResponse<List<AdminCategoryResponse>> update(@PathVariable Long id, @Valid @RequestBody CategoryUpdateRequest request) {
        return ApiResponse.ok(adminCategoryService.update(id, request));
    }

    @PutMapping("/order")
    public ApiResponse<List<AdminCategoryResponse>> reorder(@Valid @RequestBody CategoryOrderRequest request) {
        return ApiResponse.ok(adminCategoryService.reorder(request.ids()));
    }
}
