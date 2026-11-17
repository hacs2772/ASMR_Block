package com.asmrblock.hide;

import com.asmrblock.hide.HideDtos.HiddenCreatorResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface HiddenCreatorMapper {

    /** 내가 숨긴 크리에이터 (최근에 숨긴 순) */
    List<HiddenCreatorResponse> list(@Param("userId") Long userId);

    boolean isActiveUser(@Param("id") Long id);

    boolean exists(@Param("userId") Long userId, @Param("creatorId") Long creatorId);

    void insert(@Param("userId") Long userId, @Param("creatorId") Long creatorId);

    void delete(@Param("userId") Long userId, @Param("creatorId") Long creatorId);

    void deleteAllOf(@Param("userId") Long userId);
}
