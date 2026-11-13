package com.asmrblock.dto.response;

/** 토큰 갱신 응답. refreshToken도 매번 새로 바뀌므로 앱/웹은 둘 다 저장해야 합니다. */
public record TokenResponse(String accessToken, String refreshToken) {
}
