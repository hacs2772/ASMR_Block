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

    /** seconds초짜리 작은 테스트 영상(mp4, 화면 + 사인파 소리). withSound=false면 소리 없는 영상 */
    public static byte[] testVideo(int seconds, boolean withSound) {
        java.util.List<String> args = new java.util.ArrayList<>(java.util.List.of("ffmpeg", "-nostdin", "-loglevel", "error", "-y",
                "-f", "lavfi", "-i", "testsrc=size=640x360:rate=10:duration=" + seconds));
        if (withSound) {
            args.addAll(java.util.List.of("-f", "lavfi", "-i", "sine=frequency=440:duration=" + seconds, "-c:a", "aac", "-shortest"));
        }
        args.addAll(java.util.List.of("-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p"));
        return make(args, ".mp4");
    }

    /** 앞 silentSeconds초는 조용하고, 뒤 toneSeconds초는 사인파인 MP3 (파형 모양 확인용) */
    public static byte[] silenceThenToneMp3(int silentSeconds, int toneSeconds) {
        return make(java.util.List.of("ffmpeg", "-nostdin", "-loglevel", "error", "-y",
                "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo:d=" + silentSeconds,
                "-f", "lavfi", "-i", "sine=frequency=500:duration=" + toneSeconds,
                "-filter_complex", "[1:a]aformat=channel_layouts=stereo[t];[0:a][t]concat=n=2:v=0:a=1",
                "-c:a", "libmp3lame", "-b:a", "96k"), ".mp3");
    }

    /** 작은 PNG 사진 */
    public static byte[] testPng() {
        return make(java.util.List.of("ffmpeg", "-nostdin", "-loglevel", "error", "-y",
                "-f", "lavfi", "-i", "color=c=0x58A6F2:size=900x500", "-frames:v", "1"), ".png");
    }

    private static byte[] make(java.util.List<String> args, String suffix) {
        try {
            Path file = Files.createTempFile("test-media-", suffix);
            java.util.List<String> all = new java.util.ArrayList<>(args);
            all.add(file.toString());
            Process process = new ProcessBuilder(all).redirectErrorStream(true).start();
            if (!process.waitFor(60, TimeUnit.SECONDS) || process.exitValue() != 0) {
                throw new IllegalStateException("테스트 파일 생성 실패: " + new String(process.getInputStream().readAllBytes()));
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
