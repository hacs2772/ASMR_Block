# syntax=docker/dockerfile:1
# =====================================================
# ASMR Block 백엔드 이미지
# 1단계에서 소스를 빌드하고, 2단계에는 실행에 필요한 것만 담습니다.
# =====================================================

# ---- 1단계: 빌드 ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
COPY src src
# Windows에서 받아도 줄바꿈 문제(CRLF) 없도록 정리
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew
# Gradle 캐시를 재사용해서 두 번째 빌드부터는 빨라짐
RUN --mount=type=cache,target=/root/.gradle ./gradlew --no-daemon bootJar

# ---- 2단계: 실행 ----
FROM eclipse-temurin:21-jre
# ffmpeg: 샘플 음원 생성 + (다음 단계) 블록 합치기/음량 맞추기에 사용
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg curl \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /workspace/build/libs/app.jar app.jar
COPY scripts scripts
RUN sed -i 's/\r$//' scripts/*.sh && chmod +x scripts/*.sh
EXPOSE 8080
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
