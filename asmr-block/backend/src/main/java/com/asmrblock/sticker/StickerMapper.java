package com.asmrblock.sticker;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface StickerMapper {

    /** 숨긴 것까지 모두 (이미 붙인 블록은 숨긴 스티커도 그려야 해서) */
    List<Sticker> findAll();

    List<String> findActiveCodes();

    Sticker findByCode(String code);

    boolean exists(String code);

    int nextSortOrder();

    void insert(Sticker sticker);

    void update(@Param("code") String code, @Param("name") String name, @Param("active") Boolean active);

    void updateSortOrder(@Param("code") String code, @Param("sortOrder") int sortOrder);
}
