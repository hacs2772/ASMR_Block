package com.asmrblock.sleep;

import com.asmrblock.recommend.TasteGroup;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Mapper
public interface SleepMapper {

    List<NightActivity> activity(@Param("userId") Long userId, @Param("fromUtc") LocalDateTime fromUtc,
                                 @Param("toUtc") LocalDateTime toUtc);

    List<SleepNightRow> nights(@Param("userId") Long userId, @Param("from") LocalDate from, @Param("to") LocalDate to);

    void upsert(@Param("userId") Long userId, @Param("night") LocalDate night, @Param("rating") int rating);

    void deletePlaylists(@Param("userId") Long userId, @Param("night") LocalDate night);

    void insertPlaylists(@Param("userId") Long userId, @Param("night") LocalDate night,
                         @Param("playlistIds") Collection<Long> playlistIds);

    List<TasteGroup> goodNightGroups(@Param("userId") Long userId, @Param("since") LocalDate since, @Param("limit") int limit);

    void deleteAllOf(@Param("userId") Long userId);

    SleepStats stats(@Param("since") LocalDate since);
}
