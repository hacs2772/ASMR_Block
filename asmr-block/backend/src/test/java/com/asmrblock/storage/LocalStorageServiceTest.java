package com.asmrblock.storage;

import com.asmrblock.config.AppProperties;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalStorageServiceTest {

    @AfterEach
    void clearRequest() {
        RequestContextHolder.resetRequestAttributes();
    }

    private static LocalStorageService storage(String publicBaseUrl) {
        return new LocalStorageService(new AppProperties(
                new AppProperties.Jwt("x".repeat(32), Duration.ofMinutes(30)),
                new AppProperties.Auth(Duration.ofDays(14)),
                new AppProperties.Storage("build/test-media", publicBaseUrl),
                new AppProperties.Cors(List.of()),
                new AppProperties.PlayCount(Duration.ofMinutes(30)),
                new AppProperties.Audio("ffmpeg", "ffprobe", -24, Duration.ofMinutes(1)),
                new AppProperties.Render(1, 1.5, 3),
                new AppProperties.Shop(100)));
    }

    @Test
    @DisplayName("주소를 설정하면 그 주소를 쓴다 (운영: CDN)")
    void configuredBaseUrl() {
        assertThat(storage("https://cdn.example.com/").publicUrl("blocks/a.mp3"))
                .isEqualTo("https://cdn.example.com/blocks/a.mp3");
    }

    @Test
    @DisplayName("비워두면 요청이 들어온 주소 기준 → 휴대폰에서도 재생 가능한 URL")
    void requestBasedUrl() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/blocks");
        request.setScheme("http");
        request.setServerName("192.168.0.10");
        request.setServerPort(8080);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        assertThat(storage("").publicUrl("samples/rain.mp3"))
                .isEqualTo("http://192.168.0.10:8080/files/samples/rain.mp3");
    }

    @Test
    @DisplayName("외부 URL은 그대로, 빈 키는 null, 경로 탈출은 거부")
    void edgeCases() {
        LocalStorageService storage = storage("http://localhost:8080/files");
        assertThat(storage.publicUrl("https://other.com/x.mp3")).isEqualTo("https://other.com/x.mp3");
        assertThat(storage.publicUrl(null)).isNull();
        assertThatThrownBy(() -> storage.resolve("../../etc/passwd")).isInstanceOf(IllegalArgumentException.class);
    }
}
