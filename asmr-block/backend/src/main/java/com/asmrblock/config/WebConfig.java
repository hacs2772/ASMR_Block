package com.asmrblock.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.time.Duration;

/**
 * 로컬 저장소의 음원 파일을 /files/** 주소로 제공합니다.
 * (구간 탐색용 Range 요청도 지원 - 나중에 S3/R2 + CDN으로 교체 예정)
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final AppProperties properties;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String location = Path.of(properties.storage().localDir()).toAbsolutePath().normalize().toUri().toString();
        registry.addResourceHandler("/files/**")
                .addResourceLocations(location.endsWith("/") ? location : location + "/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic());
    }
}
