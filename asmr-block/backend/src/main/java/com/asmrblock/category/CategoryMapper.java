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

    /** 여러 블록의 태그를 쿼리 한 번으로 조회 */
    List<BlockTag> findTagsByBlockIds(@Param("blockIds") Collection<Long> blockIds);
}
