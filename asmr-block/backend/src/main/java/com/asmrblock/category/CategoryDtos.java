package com.asmrblock.category;

import java.util.List;

public final class CategoryDtos {

    private CategoryDtos() {
    }

    /** 블록에 달린 카테고리 (소분류면 parentName에 대분류 이름) */
    public record CategoryResponse(Long id, String name, String color, String icon, Long parentId, String parentName) {
        public static CategoryResponse from(SoundCategory category) {
            return category == null ? null : new CategoryResponse(
                    category.getId(), category.getName(), category.getColor(), category.getIcon(),
                    category.getParentId(), category.getParentName());
        }
    }

    /** 메뉴 트리: 대분류 + 소분류 목록 */
    public record CategoryTreeResponse(
            Long id, String name, String color, String icon, String description, List<CategoryResponse> children) {
    }

    public record TagResponse(Long id, String name) {
    }
}
