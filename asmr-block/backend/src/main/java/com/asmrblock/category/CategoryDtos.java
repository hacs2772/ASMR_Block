package com.asmrblock.category;

import java.util.List;

public final class CategoryDtos {

    private CategoryDtos() {
    }

    /**
     * 블록에 달린 카테고리 (소분류면 parentName·parentCode에 대분류)
     * code: tap.tapping 처럼 분류 코드. groupCode: 대분류 코드(tap) — 앱·웹이 파형 모양을 고를 때 씀
     */
    public record CategoryResponse(Long id, String name, String code, String groupCode, String color, String icon,
                                   Long parentId, String parentName) {
        public static CategoryResponse from(SoundCategory category) {
            if (category == null) {
                return null;
            }
            String groupCode = category.getParentId() == null ? category.getCode() : category.getParentCode();
            return new CategoryResponse(category.getId(), category.getName(), category.getCode(), groupCode,
                    category.getColor(), category.getIcon(), category.getParentId(), category.getParentName());
        }
    }

    /** 메뉴 트리: 대분류(트리거 묶음) + 소분류 목록 */
    public record CategoryTreeResponse(
            Long id, String name, String code, String color, String icon, String description,
            List<CategoryResponse> children) {
    }

    public record TagResponse(Long id, String name) {
    }
}
