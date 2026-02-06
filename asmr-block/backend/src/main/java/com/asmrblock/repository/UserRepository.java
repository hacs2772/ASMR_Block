package com.asmrblock.repository;

import com.asmrblock.domain.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Optional;

@Mapper
public interface UserRepository {
    
    // 회원 등록
    void insert(User user);
    
    // ID로 조회
    Optional<User> findById(Long id);
    
    // 이메일로 조회
    Optional<User> findByEmail(String email);
    
    // 이메일 존재 여부
    boolean existsByEmail(String email);
    
    // 회원 정보 수정
    void update(User user);
    
    // 회원 삭제 (soft delete)
    void deactivate(Long id);
}
