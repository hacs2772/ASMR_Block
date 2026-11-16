package com.asmrblock.category;

import com.asmrblock.category.CategoryDtos.AdminCategoryResponse;
import com.asmrblock.category.CategoryDtos.CategoryCreateRequest;
import com.asmrblock.category.CategoryDtos.CategoryUpdateRequest;
import com.asmrblock.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 관리자: 트리거 종류(메뉴 트리) 관리. 앱·웹은 GET /categories로 받아 그리므로 앱 업데이트 없이 바로 바뀜.
 * - 대분류(트리거 묶음): 색을 정함 → 블록 색. 소분류: 아이콘을 정함 → 블록 아이콘, 색은 대분류를 따름
 * - 지우지 않고 숨김 (이미 달린 블록이 있어서). 코드는 만든 뒤 못 바꿈 (앱·웹 파형 모양에 씀)
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminCategoryService {

    private static final String DEFAULT_COLOR = "#9AA0AE";

    private final CategoryMapper categoryMapper;

    public List<AdminCategoryResponse> tree() {
        List<SoundCategory> all = categoryMapper.findAllForAdmin();
        Map<Long, List<AdminCategoryResponse>> children = all.stream()
                .filter(c -> c.getParentId() != null)
                .collect(Collectors.groupingBy(SoundCategory::getParentId,
                        Collectors.mapping(c -> AdminCategoryResponse.of(c, List.of()), Collectors.toList())));
        return all.stream()
                .filter(c -> c.getParentId() == null)
                .map(c -> AdminCategoryResponse.of(c, children.getOrDefault(c.getId(), List.of())))
                .toList();
    }

    @Transactional
    public List<AdminCategoryResponse> create(CategoryCreateRequest request) {
        SoundCategory parent = null;
        if (request.parentId() != null) {
            parent = find(request.parentId());
            if (parent.getParentId() != null) {
                throw ApiException.badRequest("소분류 아래에는 또 나눌 수 없어요. 트리거 묶음(대분류)을 골라 주세요.");
            }
        } else if (blank(request.color())) {
            throw ApiException.badRequest("트리거 묶음의 블록 색을 골라 주세요.");
        }
        String code = null;
        if (!blank(request.code())) {
            code = parent == null ? request.code() : parent.getCode() + "." + request.code();
            if (categoryMapper.existsCode(code)) {
                throw ApiException.conflict("이미 있는 코드예요: " + code);
            }
        }
        SoundCategory category = SoundCategory.builder()
                .code(code)
                .name(request.name().trim())
                .color(parent == null ? request.color() : Objects.requireNonNullElse(parent.getColor(), DEFAULT_COLOR))
                .icon(request.icon())
                .description(blank(request.description()) ? null : request.description().trim())
                .nameEn(blank(request.nameEn()) ? null : request.nameEn().trim())
                .descriptionEn(blank(request.descriptionEn()) ? null : request.descriptionEn().trim())
                .parentId(parent == null ? null : parent.getId())
                .sortOrder(categoryMapper.nextSortOrder(parent == null ? null : parent.getId()))
                .build();
        categoryMapper.insert(category);
        if (code == null) {
            // 코드를 안 적으면 자동: 대분류 g12, 소분류 tap.c13
            categoryMapper.updateCode(category.getId(),
                    parent == null ? "g" + category.getId() : parent.getCode() + ".c" + category.getId());
        }
        return tree();
    }

    @Transactional
    public List<AdminCategoryResponse> update(Long id, CategoryUpdateRequest request) {
        SoundCategory category = find(id);
        boolean group = category.getParentId() == null;
        if (!group && request.color() != null) {
            throw ApiException.badRequest("소분류의 색은 트리거 묶음(대분류) 색을 따라요. 대분류에서 바꿔 주세요.");
        }
        String name = request.name() == null ? null : request.name().trim();
        if (name != null && name.isEmpty()) {
            throw ApiException.badRequest("이름을 적어 주세요.");
        }
        categoryMapper.update(id, name, request.color(), request.icon(),
                request.description() == null ? null : request.description().trim(),
                request.nameEn() == null ? null : request.nameEn().trim(),
                request.descriptionEn() == null ? null : request.descriptionEn().trim(), request.active());
        if (group && request.color() != null) {
            categoryMapper.updateChildrenColor(id, request.color());
        }
        return tree();
    }

    /** 같은 줄 순서 (대분류끼리 또는 한 대분류의 소분류끼리). 섞어 보내면 거절 */
    @Transactional
    public List<AdminCategoryResponse> reorder(List<Long> ids) {
        List<Long> unique = ids.stream().distinct().toList();
        List<SoundCategory> categories = unique.stream().map(this::find).toList();
        long parents = categories.stream().map(c -> Objects.requireNonNullElse(c.getParentId(), 0L)).distinct().count();
        if (parents > 1) {
            throw ApiException.badRequest("같은 줄에 있는 분류끼리만 순서를 바꿀 수 있어요.");
        }
        for (int i = 0; i < unique.size(); i++) {
            categoryMapper.updateSortOrder(unique.get(i), i + 1);
        }
        return tree();
    }

    private SoundCategory find(Long id) {
        SoundCategory category = id == null ? null : categoryMapper.findAnyById(id);
        if (category == null || category.getCode() == null) {
            throw ApiException.notFound("분류를 찾을 수 없어요.");
        }
        return category;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
