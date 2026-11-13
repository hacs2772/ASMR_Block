package com.asmrblock.play;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;

@Mapper
public interface PlayLogMapper {

    boolean existsSince(@Param("userId") Long userId,
                        @Param("targetType") PlayTarget targetType,
                        @Param("targetId") Long targetId,
                        @Param("since") LocalDateTime since);

    void insert(@Param("userId") Long userId,
                @Param("targetType") PlayTarget targetType,
                @Param("targetId") Long targetId);
}
