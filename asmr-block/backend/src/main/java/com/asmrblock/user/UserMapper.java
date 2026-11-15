package com.asmrblock.user;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Optional;

@Mapper
public interface UserMapper {

    void insert(User user);

    Optional<User> findById(Long id);

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /** 공개용 관리자 계정: 비밀번호를 맞추고 관리자로 */
    void updateAdminAccount(@Param("id") Long id, @Param("password") String password);

    void update(User user);

    /** 탈퇴: 개인정보를 지우고 비활성화 (블록 업로더 기록은 남김) */
    void anonymize(Long id);
}
