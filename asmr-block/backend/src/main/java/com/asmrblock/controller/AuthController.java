package com.asmrblock.controller;

import com.asmrblock.domain.User;
import com.asmrblock.dto.request.LoginRequest;
import com.asmrblock.dto.request.RefreshTokenRequest;
import com.asmrblock.dto.request.SignupRequest;
import com.asmrblock.dto.response.ApiResponse;
import com.asmrblock.dto.response.LoginResponse;
import com.asmrblock.dto.response.TokenResponse;
import com.asmrblock.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthService authService;
    
    // 회원가입
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<Map<String, Object>>> signup(
            @Valid @RequestBody SignupRequest request) {
        
        User user = authService.signup(request);
        
        Map<String, Object> data = Map.of(
            "id", user.getId(),
            "email", user.getEmail(),
            "nickname", user.getNickname()
        );
        
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("회원가입이 완료되었습니다.", data));
    }
    
    // 로그인
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request) {
        
        LoginResponse response = authService.login(request);
        
        return ResponseEntity.ok(ApiResponse.success("로그인 성공", response));
    }
    
    // 토큰 갱신 (refreshToken도 새로 바뀜 - 둘 다 저장할 것)
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @Valid @RequestBody RefreshTokenRequest request) {
        
        TokenResponse tokens = authService.refresh(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success(tokens));
    }
    
    // 로그아웃 (서버에서 refreshToken 폐기)
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @Valid @RequestBody RefreshTokenRequest request) {
        
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.success("로그아웃 되었습니다."));
    }
}
