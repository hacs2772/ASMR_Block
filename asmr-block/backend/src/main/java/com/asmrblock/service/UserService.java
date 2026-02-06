package com.asmrblock.service;

import com.asmrblock.domain.User;
import com.asmrblock.dto.request.UserUpdateRequest;
import com.asmrblock.exception.CustomException;
import com.asmrblock.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    
    // 내 정보 조회
    @Transactional(readOnly = true)
    public User getMyInfo(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> CustomException.notFound("사용자를 찾을 수 없습니다."));
    }
    
    // 내 정보 수정
    @Transactional
    public User updateMyInfo(Long userId, UserUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> CustomException.notFound("사용자를 찾을 수 없습니다."));
        
        // 변경할 내용 설정
        if (request.getNickname() != null) {
            user.setNickname(request.getNickname());
        }
        if (request.getProfileImage() != null) {
            user.setProfileImage(request.getProfileImage());
        }
        if (request.getLanguage() != null) {
            user.setLanguage(request.getLanguage());
        }
        
        userRepository.update(user);
        
        return userRepository.findById(userId).orElse(user);
    }
}
