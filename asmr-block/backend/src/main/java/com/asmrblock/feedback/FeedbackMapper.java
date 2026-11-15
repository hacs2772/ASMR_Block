package com.asmrblock.feedback;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FeedbackMapper {

    void insert(Feedback feedback);

    /** done이 null이면 전부, true/false면 확인함/새 의견만 */
    List<Feedback> findAll(@Param("done") Boolean done, @Param("offset") int offset, @Param("limit") int limit);

    long count(@Param("done") Boolean done);

    Feedback findById(Long id);

    void updateDone(@Param("id") Long id, @Param("done") boolean done);
}
