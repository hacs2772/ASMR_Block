package com.asmrblock.auth;

import com.asmrblock.user.UserResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
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
            String nickname) {
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

    /** refreshToken도 매번 새로 바뀌므로 앱/웹은 둘 다 저장해야 합니다. */
    public record TokenResponse(String accessToken, String refreshToken) {
    }
}
