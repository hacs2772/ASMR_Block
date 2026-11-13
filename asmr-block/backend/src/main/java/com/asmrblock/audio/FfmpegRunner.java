package com.asmrblock.audio;

import com.asmrblock.config.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.function.DoubleConsumer;

/** ffmpeg / ffprobe 실행기. 실패하거나 시간이 너무 걸리면 AudioProcessingException. */
@Slf4j
@Component
public class FfmpegRunner {

    private final String ffmpegPath;
    private final String ffprobePath;

    public FfmpegRunner(AppProperties properties) {
        this.ffmpegPath = properties.audio().ffmpegPath();
        this.ffprobePath = properties.audio().ffprobePath();
    }

    /** ffmpeg 실행. args에는 "ffmpeg"를 뺀 나머지 인자를 넣습니다. */
    public void ffmpeg(List<String> args, Duration timeout) {
        ffmpeg(args, timeout, seconds -> { });
    }

    /** onProgress: 처리한 오디오 길이(초). args에 "-progress pipe:1" 이 있을 때 호출됨 */
    public void ffmpeg(List<String> args, Duration timeout, DoubleConsumer onProgress) {
        List<String> command = new ArrayList<>();
        command.add(ffmpegPath);
        command.addAll(List.of("-nostdin", "-hide_banner", "-loglevel", "error", "-y"));
        command.addAll(args);
        run(command, timeout, onProgress);
    }

    /** 오디오 길이(초, 반올림) */
    public int probeDurationSeconds(Path file) {
        String output = run(List.of(ffprobePath, "-v", "error",
                "-show_entries", "format=duration", "-of", "csv=p=0", file.toString()), Duration.ofSeconds(30),
                seconds -> { });
        try {
            return (int) Math.round(Double.parseDouble(output.trim()));
        } catch (NumberFormatException e) {
            throw new AudioProcessingException("오디오 길이를 읽을 수 없습니다.");
        }
    }

    private String run(List<String> command, Duration timeout, DoubleConsumer onProgress) {
        log.debug("실행: {}", String.join(" ", command));
        Process process;
        try {
            process = new ProcessBuilder(command).redirectErrorStream(true).start();
        } catch (IOException e) {
            throw new AudioProcessingException("ffmpeg를 실행할 수 없습니다. 설치되어 있는지 확인하세요.", e);
        }

        // 출력 버퍼가 가득 차서 프로세스가 멈추지 않도록 별도 스레드에서 한 줄씩 계속 읽음
        StringBuilder output = new StringBuilder();
        Thread reader = Thread.ofVirtual().start(() -> {
            try (var in = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = in.readLine()) != null) {
                    if (line.startsWith("out_time_us=")) {
                        reportProgress(line.substring("out_time_us=".length()), onProgress);
                    } else if (!line.contains("=") || line.startsWith("[")) {
                        // 진행률 줄(key=value)이 아닌 것만 오류 메시지용으로 보관 (최대 20KB)
                        if (output.length() < 20_000) {
                            output.append(line).append('\n');
                        }
                    }
                }
            } catch (IOException ignored) {
                // 프로세스가 강제 종료되면 여기로 옴
            }
        });

        try {
            if (!process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                throw new AudioProcessingException("오디오 처리 시간이 초과되었습니다.");
            }
            reader.join();
        } catch (InterruptedException e) {
            process.destroyForcibly();
            Thread.currentThread().interrupt();
            throw new AudioProcessingException("오디오 처리가 중단되었습니다.", e);
        }

        if (process.exitValue() != 0) {
            throw new AudioProcessingException("오디오 처리 실패: " + tail(output.toString()));
        }
        return output.toString();
    }

    private static void reportProgress(String microseconds, DoubleConsumer onProgress) {
        try {
            long us = Long.parseLong(microseconds.trim());
            if (us > 0) {
                onProgress.accept(us / 1_000_000.0);
            }
        } catch (NumberFormatException ignored) {
            // "N/A" 등은 무시
        }
    }

    private static String tail(String text) {
        String trimmed = text.strip();
        return trimmed.length() <= 500 ? trimmed : trimmed.substring(trimmed.length() - 500);
    }
}
