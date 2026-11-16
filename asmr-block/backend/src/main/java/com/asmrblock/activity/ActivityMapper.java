package com.asmrblock.activity;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Mapper
public interface ActivityMapper {

    /** 그날 한 줄 (이미 있으면 그대로) */
    void insertDay(@Param("userId") Long userId, @Param("day") LocalDate day);

    void insertListen(@Param("userId") Long userId, @Param("playlistId") Long playlistId, @Param("minutes") int minutes);

    boolean existsListenSince(@Param("userId") Long userId, @Param("playlistId") Long playlistId,
                              @Param("minutes") int minutes, @Param("since") LocalDateTime since);
}
