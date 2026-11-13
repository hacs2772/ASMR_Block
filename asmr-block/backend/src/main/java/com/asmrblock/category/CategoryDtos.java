package com.asmrblock.category;

public final class CategoryDtos {

    private CategoryDtos() {
    }

    public record CategoryResponse(Long id, String name, String color, String icon) {
        public static CategoryResponse from(SoundCategory category) {
            return category == null ? null : new CategoryResponse(
                    category.getId(), category.getName(), category.getColor(), category.getIcon());
        }
    }

    public record TagResponse(Long id, String name) {
    }
}
