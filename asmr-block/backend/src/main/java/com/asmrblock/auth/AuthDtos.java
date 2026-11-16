package com.asmrblock.auth;

import com.asmrblock.user.UserResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 인증 API 요청/응답 */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record SignupRequest(
            @NotBlank(message = "이메일은 필수입니다.")
            @Email(message = "올바른 이메일 형식이 아닙니다.")
            @Size(max = 255, message = "이메일이 너무 깁니다.")
            String email,

            @NotBlank(message = "비밀번호는 필수입니다.")
            @Size(min = 8, max = 64, message = "비밀번호는 8~64자여야 합니다.")
            String password,

            @NotBlank(message = "닉네임은 필수입니다.")
            @Size(min = 2, max = 20, message = "닉네임은 2~20자여야 합니다.")
            String nickname,

            /** 화면 언어 (선택, 없으면 ko) — 나중에 알림·메일을 이 언어로 */
            @Pattern(regexp = "ko|en", message = "언어는 ko 또는 en이어야 합니다.")
            String language) {
    }

    public record LoginRequest(
            @NotBlank(message = "이메일은 필수입니다.")
            String email,

            @NotBlank(message = "비밀번호는 필수입니다.")
            String password) {
    }

    public record RefreshTokenRequest(
            @NotBlank(message = "refreshToken은 필수입니다.")
            String refreshToken) {
    }

    public record LoginResponse(String accessToken, String refreshToken, UserResponse user) {
    }

    /** 베타 로그인을 쓸 수 있는지 (정식 출시 후에는 false) */
    public record BetaStatus(boolean quickLogin) {
    }

    /**
     * 베타 로그인: 새 손님 계정 + 토큰. email/password는 이 기기에 저장해 두었다가
     * 로그아웃 뒤 "베타로 바로 시작"을 다시 누르면 같은 계정으로 로그인하는 데 씀
     */
    public record BetaLoginResponse(String accessToken, String refreshToken, UserResponse user, String email, String password) {
    }

    /** refreshToken도 매번 새로 바뀌므로 앱/웹은 둘 다 저장해야 합니다. */
    public record TokenResponse(String accessToken, String refreshToken) {
    }
}
