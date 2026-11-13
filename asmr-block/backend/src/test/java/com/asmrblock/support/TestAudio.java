package com.asmrblock.support;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

/** 테스트용 짧은 음원 생성 (ffmpeg 필요) */
public final class TestAudio {

    private TestAudio() {
    }

    /** frequency Hz 사인파 seconds초짜리 MP3 바이트 */
    public static byte[] sineMp3(int seconds, int frequency) {
        try {
            Path file = Files.createTempFile("test-audio-", ".mp3");
            Process process = new ProcessBuilder("ffmpeg", "-nostdin", "-loglevel", "error", "-y",
                    "-f", "lavfi", "-i", "sine=frequency=%d:duration=%d".formatted(frequency, seconds),
                    "-ac", "2", "-c:a", "libmp3lame", "-b:a", "96k", file.toString())
                    .redirectErrorStream(true).start();
            if (!process.waitFor(30, TimeUnit.SECONDS) || process.exitValue() != 0) {
                throw new IllegalStateException("테스트 음원 생성 실패: " + new String(process.getInputStream().readAllBytes()));
            }
            byte[] bytes = Files.readAllBytes(file);
            Files.deleteIfExists(file);
            return bytes;
        } catch (IOException e) {
            throw new IllegalStateException(e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    /** 파일 길이(초, 소수점) */
    public static double durationOf(Path file) {
        try {
            Process process = new ProcessBuilder("ffprobe", "-v", "error", "-show_entries", "format=duration",
                    "-of", "csv=p=0", file.toString()).start();
            process.waitFor(30, TimeUnit.SECONDS);
            return Double.parseDouble(new String(process.getInputStream().readAllBytes()).trim());
        } catch (IOException e) {
            throw new IllegalStateException(e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }
}
