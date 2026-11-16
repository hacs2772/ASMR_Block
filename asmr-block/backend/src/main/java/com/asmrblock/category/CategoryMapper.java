package com.asmrblock.category;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;

@Mapper
public interface CategoryMapper {

    List<SoundCategory> findAllCategories();

    boolean existsCategory(Long id);

    /** 소분류(하위 분류가 없는 활성 카테고리)인지 */
    boolean isLeafCategory(Long id);

    List<SoundTag> findAllTags();

    int countActiveTags(@Param("ids") Collection<Long> ids);

    // ===== 관리자 =====

    /** 숨긴 것까지 모든 분류 + 블록 수 */
    List<SoundCategory> findAllForAdmin();

    /** 숨긴 것까지 */
    SoundCategory findAnyById(Long id);

    boolean existsCode(String code);

    int nextSortOrder(@Param("parentId") Long parentId);

    void insert(SoundCategory category);

    void updateCode(@Param("id") Long id, @Param("code") String code);

    void update(@Param("id") Long id, @Param("name") String name, @Param("color") String color,
                @Param("icon") String icon, @Param("description") String description,
                @Param("nameEn") String nameEn, @Param("descriptionEn") String descriptionEn, @Param("active") Boolean active);

    /** 대분류 색을 바꾸면 소분류 색도 같이 (블록 색 = 대분류) */
    void updateChildrenColor(@Param("parentId") Long parentId, @Param("color") String color);

    void updateSortOrder(@Param("id") Long id, @Param("sortOrder") int sortOrder);

    /** 여러 블록의 태그를 쿼리 한 번으로 조회 */
    List<BlockTag> findTagsByBlockIds(@Param("blockIds") Collection<Long> blockIds);
}
