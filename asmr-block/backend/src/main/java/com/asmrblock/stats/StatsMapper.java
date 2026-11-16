package com.asmrblock.stats;

import com.asmrblock.stats.StatsDtos.Day;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface StatsMapper {

    /** 숫자 한 줄 (people_total, beta_guests, ... 열 이름은 XML 참고) */
    Map<String, Object> summary();

    List<Day> daily();

    /** 어디서 그만두는지 (joined, collected, has_combo, ... 열 이름은 XML 참고) */
    Map<String, Object> funnel(@Param("days") int days);
}
