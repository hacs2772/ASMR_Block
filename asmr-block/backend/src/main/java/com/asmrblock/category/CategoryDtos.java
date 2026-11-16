package com.asmrblock.category;

import com.asmrblock.i18n.Lang;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

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
            // 영어 화면이면 영어 이름 (있을 때, V15)
            return new CategoryResponse(category.getId(), Lang.pick(category.getName(), category.getNameEn()), category.getCode(), groupCode,
                    category.getColor(), category.getIcon(), category.getParentId(),
                    Lang.pick(category.getParentName(), category.getParentNameEn()));
        }
    }

    /** 메뉴 트리: 대분류(트리거 묶음) + 소분류 목록 */
    public record CategoryTreeResponse(
            Long id, String name, String code, String color, String icon, String description,
            List<CategoryResponse> children) {
    }

    public record TagResponse(Long id, String name) {
    }

    /**
     * 관리자: 트리거 종류 (숨긴 것까지). blockCount = 이 분류에 직접 달린 블록 수 (지운 블록 제외)
     * 대분류면 children에 소분류
     */
    public record AdminCategoryResponse(
            Long id, String code, String name, String nameEn, String color, String icon, String description, String descriptionEn,
            Long parentId, int sortOrder, boolean active, int blockCount, List<AdminCategoryResponse> children) {

        public static AdminCategoryResponse of(SoundCategory c, List<AdminCategoryResponse> children) {
            return new AdminCategoryResponse(c.getId(), c.getCode(), c.getName(), c.getNameEn(), c.getColor(), c.getIcon(),
                    c.getDescription(), c.getDescriptionEn(), c.getParentId(), c.getSortOrder() == null ? 0 : c.getSortOrder(),
                    Boolean.TRUE.equals(c.getIsActive()), c.getBlockCount() == null ? 0 : c.getBlockCount(), children);
        }
    }

    /**
     * 관리자: 트리거 종류 추가. parentId가 없으면 대분류(트리거 묶음), 있으면 그 아래 소분류.
     * code: 영문 코드 (선택, 비우면 자동). color: 대분류만 (소분류는 대분류 색을 따름). icon: Ionicons 이름
     */
    public record CategoryCreateRequest(
            Long parentId,

            @NotBlank(message = "이름을 적어 주세요.")
            @Size(max = 20, message = "이름은 20자 이내로 적어 주세요.")
            String name,

            @Pattern(regexp = "^$|^[a-z][a-z0-9_-]{1,19}$", message = "코드는 영문 소문자로 시작하는 2~20자 (소문자·숫자·-·_)로 적어 주세요.")
            String code,

            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "색은 #FF8A3D 같은 형식으로 골라 주세요.")
            String color,

            @NotBlank(message = "아이콘을 골라 주세요.")
            @Pattern(regexp = "^[a-z0-9-]{1,40}$", message = "아이콘 이름이 올바르지 않아요.")
            String icon,

            @Size(max = 100, message = "설명은 100자 이내로 적어 주세요.")
            String description,

            /** 영어 이름·설명 (선택, 영어 화면에서 보임 — 비우면 한국어 이름) */
            @Size(max = 30, message = "영어 이름은 30자 이내로 적어 주세요.")
            String nameEn,

            @Size(max = 120, message = "영어 설명은 120자 이내로 적어 주세요.")
            String descriptionEn) {
    }

    /** 관리자: 트리거 종류 고치기 / 숨기기 (보낸 것만 바뀜, 코드는 못 바꿈) */
    public record CategoryUpdateRequest(
            @Size(min = 1, max = 20, message = "이름은 1~20자로 적어 주세요.")
            String name,

            @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "색은 #FF8A3D 같은 형식으로 골라 주세요.")
            String color,

            @Pattern(regexp = "^[a-z0-9-]{1,40}$", message = "아이콘 이름이 올바르지 않아요.")
            String icon,

            @Size(max = 100, message = "설명은 100자 이내로 적어 주세요.")
            String description,

            /** 영어 이름·설명 (빈 글자면 지움) */
            @Size(max = 30, message = "영어 이름은 30자 이내로 적어 주세요.")
            String nameEn,

            @Size(max = 120, message = "영어 설명은 120자 이내로 적어 주세요.")
            String descriptionEn,

            Boolean active) {
    }

    /** 관리자: 같은 줄(대분류끼리 또는 한 대분류의 소분류끼리) 순서. 앞에서부터 */
    public record CategoryOrderRequest(
            @NotEmpty(message = "순서를 정할 분류를 보내 주세요.")
            List<Long> ids) {
    }
}
