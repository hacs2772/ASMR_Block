package com.asmrblock.service;

import com.asmrblock.domain.User;
import com.asmrblock.dto.request.LoginRequest;
import com.asmrblock.dto.request.SignupRequest;
import com.asmrblock.dto.response.LoginResponse;
import com.asmrblock.exception.CustomException;
import com.asmrblock.repository.UserRepository;
import com.asmrblock.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    
    // 회원가입
    @Transactional
    public User signup(SignupRequest request) {
        // 이메일 중복 확인
        if (userRepository.existsByEmail(request.getEmail())) {
            throw CustomException.conflict("이미 사용 중인 이메일입니다.");
        }
        
        // 비밀번호 암호화 후 저장
        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .language("ko")
                .isActive(true)
                .build();
        
        userRepository.insert(user);
        return user;
    }
    
    // 로그인
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        // 사용자 조회
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> CustomException.unauthorized("이메일 또는 비밀번호가 일치하지 않습니다."));
        
        // 비밀번호 확인
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw CustomException.unauthorized("이메일 또는 비밀번호가 일치하지 않습니다.");
        }
        
        // JWT 토큰 생성
        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), user.getEmail());
        
        return LoginResponse.of(accessToken, refreshToken, user);
    }
    
    // 토큰 갱신
    public String refreshAccessToken(String refreshToken) {
        if (!jwtUtil.validateToken(refreshToken)) {
            throw CustomException.unauthorized("유효하지 않은 토큰입니다.");
        }
        
        Long userId = jwtUtil.getUserIdFromToken(refreshToken);
        String email = jwtUtil.getEmailFromToken(refreshToken);
        
        return jwtUtil.generateAccessToken(userId, email);
    }
}
