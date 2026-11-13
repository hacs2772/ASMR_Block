package com.asmrblock.user;

import org.apache.ibatis.annotations.Mapper;

import java.util.Optional;

@Mapper
public interface UserMapper {

    void insert(User user);

    Optional<User> findById(Long id);

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    void update(User user);

    /** 탈퇴: 개인정보를 지우고 비활성화 (블록 업로더 기록은 남김) */
    void anonymize(Long id);
}
