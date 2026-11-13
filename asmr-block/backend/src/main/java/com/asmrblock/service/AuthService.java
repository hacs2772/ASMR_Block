package com.asmrblock.service;

import com.asmrblock.domain.User;
import com.asmrblock.dto.request.LoginRequest;
import com.asmrblock.dto.request.SignupRequest;
import com.asmrblock.dto.response.LoginResponse;
import com.asmrblock.dto.response.TokenResponse;
import com.asmrblock.exception.CustomException;
import com.asmrblock.repository.UserRepository;
import com.asmrblock.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenService refreshTokenService;

    // 회원가입
    @Transactional
    public User signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw CustomException.conflict("이미 사용 중인 이메일입니다.");
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .nickname(request.getNickname())
                .language("ko")
                .role("USER")
                .isActive(true)
                .build();

        userRepository.insert(user);
        return user;
    }

    // 로그인
    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .filter(u -> passwordEncoder.matches(request.getPassword(), u.getPassword()))
                .orElseThrow(() -> CustomException.unauthorized("이메일 또는 비밀번호가 일치하지 않습니다."));

        String accessToken = jwtTokenProvider.createAccessToken(user.getId(), user.getRole());
        String refreshToken = refreshTokenService.issue(user.getId());
        return LoginResponse.of(accessToken, refreshToken, user);
    }

    // 토큰 갱신 (Refresh Token도 새로 발급)
    @Transactional(noRollbackFor = CustomException.class)
    public TokenResponse refresh(String refreshToken) {
        Long userId = refreshTokenService.consume(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> CustomException.unauthorized("사용할 수 없는 계정입니다."));

        return new TokenResponse(
                jwtTokenProvider.createAccessToken(user.getId(), user.getRole()),
                refreshTokenService.issue(user.getId()));
    }

    // 로그아웃 (Refresh Token 폐기 - Access Token은 짧게(30분) 살아있다가 만료됨)
    @Transactional
    public void logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
    }
}
