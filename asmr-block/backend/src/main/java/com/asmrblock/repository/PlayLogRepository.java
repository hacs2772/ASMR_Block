package com.asmrblock.repository;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;

@Mapper
public interface PlayLogRepository {

    boolean existsSince(@Param("userId") Long userId,
                        @Param("targetType") String targetType,
                        @Param("targetId") Long targetId,
                        @Param("since") LocalDateTime since);

    void insert(@Param("userId") Long userId,
                @Param("targetType") String targetType,
                @Param("targetId") Long targetId);
}
