package com.asmrblock.controller;

import com.asmrblock.domain.User;
import com.asmrblock.dto.request.UserUpdateRequest;
import com.asmrblock.dto.response.ApiResponse;
import com.asmrblock.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    // 내 정보 조회
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMyInfo(Authentication auth) {
        Long userId = (Long) auth.getPrincipal();
        User user = userService.getMyInfo(userId);
        
        Map<String, Object> data = Map.of(
            "id", user.getId(),
            "email", user.getEmail(),
            "nickname", user.getNickname(),
            "profileImage", user.getProfileImage() != null ? user.getProfileImage() : "",
            "language", user.getLanguage(),
            "createdAt", user.getCreatedAt()
        );
        
        return ResponseEntity.ok(ApiResponse.success(data));
    }
    
    // 내 정보 수정
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateMyInfo(
            Authentication auth,
            @Valid @RequestBody UserUpdateRequest request) {
        
        Long userId = (Long) auth.getPrincipal();
        User user = userService.updateMyInfo(userId, request);
        
        Map<String, Object> data = Map.of(
            "id", user.getId(),
            "nickname", user.getNickname(),
            "profileImage", user.getProfileImage() != null ? user.getProfileImage() : "",
            "language", user.getLanguage()
        );
        
        return ResponseEntity.ok(ApiResponse.success("정보가 수정되었습니다.", data));
    }
}
