package com.asmrblock.recommend;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface RecommendMapper {

    List<TasteGroup> tasteGroups(@Param("userId") Long userId, @Param("limit") int limit);

    List<Scored> blockScores(@Param("userId") Long userId, @Param("limit") int limit);

    List<Scored> comboScores(@Param("userId") Long userId, @Param("limit") int limit);
}
