package com.asmrblock.category;

import com.asmrblock.category.CategoryDtos.AdminTagResponse;
import com.asmrblock.category.CategoryDtos.TagCreateRequest;
import com.asmrblock.category.CategoryDtos.TagOrderRequest;
import com.asmrblock.category.CategoryDtos.TagUpdateRequest;
import com.asmrblock.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 관리자: 소리 느낌 태그 추가·고치기·숨기기·순서 (SecurityConfig에서 ADMIN 권한 확인). 응답은 항상 바뀐 뒤의 전체 목록 */
@RestController
@RequestMapping("/api/v1/admin/tags")
@RequiredArgsConstructor
public class AdminTagController {

    private final AdminTagService adminTagService;

    @GetMapping
    public ApiResponse<List<AdminTagResponse>> list() {
        return ApiResponse.ok(adminTagService.list());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<List<AdminTagResponse>> create(@Valid @RequestBody TagCreateRequest request) {
        return ApiResponse.ok("태그를 추가했어요.", adminTagService.create(request));
    }

    @PatchMapping("/{id}")
    public ApiResponse<List<AdminTagResponse>> update(@PathVariable Long id, @Valid @RequestBody TagUpdateRequest request) {
        return ApiResponse.ok(adminTagService.update(id, request));
    }

    @PutMapping("/order")
    public ApiResponse<List<AdminTagResponse>> reorder(@Valid @RequestBody TagOrderRequest request) {
        return ApiResponse.ok(adminTagService.reorder(request.ids()));
    }
}
