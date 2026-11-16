package com.asmrblock.audio;

import com.asmrblock.config.AppProperties;
import org.springframework.stereotype.Service;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.function.IntConsumer;

/** 오디오 처리 기능 모음 (업로드 정규화, 믹싱) */
@Service
public class AudioService {

    private final FfmpegRunner ffmpeg;
    private final AppProperties.Audio audio;
    private final MixCommandBuilder mixCommandBuilder;

    public AudioService(FfmpegRunner ffmpeg, AppProperties properties) {
        this.ffmpeg = ffmpeg;
        this.audio = properties.audio();
        this.mixCommandBuilder = new MixCommandBuilder(
                properties.render().crossfadeSeconds(), properties.render().fadeSeconds());
    }

    /**
     * 업로드된 음원을 서비스 표준 형식으로 변환: 44.1kHz 스테레오 MP3 192kbps, 음량 -24 LUFS.
     * 모든 블록의 음량이 같아서, 섞거나 이어 붙여도 갑자기 커지거나 작아지지 않음.
     *
     * @return 변환된 파일 길이(초)
     */
    public int normalize(Path input, Path output) {
        return normalize(input, output, null);
    }

    /**
     * normalize + 구간 자르기: trim이 있으면 그 부분만 쓰고, 잘린 앞뒤가 '뚝' 하지 않게 TRIM_FADE초씩 서서히 커지고 작아짐.
     * 자르기는 -ss가 아니라 atrim 필터로 (ffmpeg 6.1에서 -ss로 중간부터 읽고 loudnorm으로 파일 끝까지 가면 멈추는 문제가 있음)
     */
    public int normalize(Path input, Path output, Trim trim) {
        String filter = String.format(Locale.ROOT, "loudnorm=I=%.1f:TP=-2:LRA=11,aresample=44100", audio.targetLufs());
        if (trim != null) {
            double fade = Math.min(TRIM_FADE_SECONDS, trim.length() / 4);
            filter = String.format(Locale.ROOT,
                    "atrim=start=%.3f:end=%.3f,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=%.2f,afade=t=out:st=%.3f:d=%.2f,",
                    trim.start(), trim.end(), fade, trim.length() - fade, fade) + filter;
        }
        ffmpeg.ffmpeg(List.of("-i", input.toString(), "-vn", "-map", "0:a:0", "-af", filter,
                "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k", output.toString()), audio.processTimeout());
        return duration(output);
    }

    /** 원본 보관용: 다시 인코딩하지 않고 고른 구간만 잘라 냄 (형식 그대로, 경계는 몇 ms 차이 날 수 있음) */
    public void trimCopy(Path input, Path output, Trim trim) {
        ffmpeg.ffmpeg(List.of("-ss", seconds(trim.start()), "-i", input.toString(), "-t", seconds(trim.length()),
                "-vn", "-map", "0:a:0", "-c", "copy", output.toString()), audio.processTimeout());
    }

    /**
     * 업로드 전 "구간 고르기" 화면의 파형: 소리 크기(절댓값)를 1초에 WAVE_RATE개로 줄여서 buckets칸마다 가장 큰 값.
     * 먼저 절댓값을 쓰니 줄여도 탭핑·바스락 같은 높은 소리의 크기가 그대로 남음 (그냥 줄이면 높은 소리가 사라짐).
     * 0~1 (가장 큰 칸 = 1), 작은 소리도 보이게 살짝 키움. 길이는 소수점까지. 10분짜리에 3초쯤.
     *
     * @param pcmFile 잠깐 쓰는 파일 (부르는 쪽에서 지움)
     */
    public Waveform waveform(Path input, Path pcmFile, int buckets) {
        ffmpeg.ffmpeg(List.of("-i", input.toString(), "-vn", "-map", "0:a:0", "-af", "aeval=abs(val(0))", "-ac", "1",
                "-ar", String.valueOf(WAVE_RATE), "-f", "s16le", "-c:a", "pcm_s16le", pcmFile.toString()), audio.processTimeout());
        try {
            long samples = Files.size(pcmFile) / 2;
            if (samples < WAVE_RATE) {
                throw new AudioProcessingException("소리가 너무 짧거나 없습니다.");
            }
            float[] peaks = new float[buckets];
            try (InputStream in = new BufferedInputStream(Files.newInputStream(pcmFile), 1 << 16)) {
                long index = 0;
                int lo;
                while ((lo = in.read()) >= 0) {
                    int hi = in.read();
                    if (hi < 0) {
                        break;
                    }
                    int value = Math.abs((short) ((hi << 8) | lo));
                    int bucket = (int) Math.min(buckets - 1, index * buckets / samples);
                    peaks[bucket] = Math.max(peaks[bucket], value);
                    index++;
                }
            }
            float max = 0;
            for (float p : peaks) {
                max = Math.max(max, p);
            }
            for (int i = 0; i < buckets; i++) {
                double level = max > 0 ? Math.pow(peaks[i] / max, 0.6) : 0;
                peaks[i] = Math.round(level * 1000) / 1000f;
            }
            return new Waveform(samples / (double) WAVE_RATE, peaks);
        } catch (IOException e) {
            throw new AudioProcessingException("파형을 만들 수 없습니다.", e);
        }
    }

    private static String seconds(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }

    /** 잘린 앞뒤를 부드럽게 (초) */
    public static final double TRIM_FADE_SECONDS = 0.5;
    /** 파형용으로 줄인 1초당 소리 개수 (1시간 = 7MB 정도) */
    static final int WAVE_RATE = 1000;

    /** 고른 구간 (초) */
    public record Trim(double start, double end) {
        public double length() {
            return end - start;
        }
    }

    /** 파형: 길이(초, 소수점) + 칸마다 0~1 */
    public record Waveform(double durationSeconds, float[] peaks) {
    }

    /**
     * 플레이리스트 구성을 하나의 파일로 합침.
     * @param onProgress 진행률(0~99) 알림. 끝나면 호출하는 쪽에서 100으로
     * @return 결과 파일 길이(초)
     */
    public int mix(MixPlan plan, IntConsumer onProgress) {
        MixCommandBuilder.Command command = mixCommandBuilder.build(plan);
        double total = Math.max(1, command.durationSeconds());
        // 긴 조합(최대 10시간)도 끝낼 수 있게: 기본 제한시간과 "길이의 1/5" 중 큰 값
        Duration timeout = Duration.ofSeconds(Math.max(audio.processTimeout().toSeconds(), (long) (total / 5)));
        ffmpeg.ffmpeg(command.args(), timeout,
                seconds -> onProgress.accept((int) Math.min(99, Math.floor(seconds * 100 / total))));
        return duration(plan.output());
    }

    /**
     * 맛보기 파일: 앞 seconds초만 잘라 끝 3초를 서서히 줄임 (128kbps).
     */
    public void preview(Path input, Path output, int seconds) {
        int length = Math.max(1, Math.min(seconds, duration(input)));
        double fade = Math.min(3.0, length / 3.0);
        ffmpeg.ffmpeg(List.of(
                "-i", input.toString(),
                "-t", String.valueOf(length),
                "-af", String.format(Locale.ROOT, "afade=t=out:st=%.2f:d=%.2f", length - fade, fade),
                "-ac", "2", "-c:a", "libmp3lame", "-b:a", "128k",
                output.toString()), audio.processTimeout());
    }

    /**
     * 블록 영상: "진짜 그 장소·그 장면이구나" 하고 보는 용도라 화질보다 가볍게.
     * 480p · 24fps · 소리 없음(소리는 블록 음원) · 휴대폰에서 바로 재생되는 mp4
     */
    public void blockVideo(Path input, Path output) {
        ffmpeg.ffmpeg(List.of(
                "-i", input.toString(),
                "-an", "-map", "0:v:0",
                "-vf", "scale=-2:'min(480,ih)':flags=bicubic,fps=24",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "32", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart",
                output.toString()), audio.processTimeout());
    }

    /** 블록 겉면 사진: 가로 최대 640px jpg (블록 모양에 맞게 자르는 건 화면에서) */
    public void coverImage(Path input, Path output) {
        ffmpeg.ffmpeg(List.of(
                "-i", input.toString(),
                "-vf", "scale='min(640,iw)':-2",
                "-frames:v", "1", "-q:v", "4",
                output.toString()), audio.processTimeout());
    }

    /** 스티커 그림 (관리자 업로드): 256px 안으로 줄인 투명 배경 PNG */
    public void stickerImage(Path input, Path output) {
        ffmpeg.ffmpeg(List.of(
                "-i", input.toString(),
                "-vf", "scale=w='min(256,iw)':h='min(256,ih)':force_original_aspect_ratio=decrease",
                "-frames:v", "1", "-pix_fmt", "rgba",
                output.toString()), audio.processTimeout());
    }

    public int duration(Path file) {
        return ffmpeg.probeDurationSeconds(file);
    }

    /** 길이(초, 소수점) */
    public double exactDuration(Path file) {
        return ffmpeg.probeDuration(file);
    }

    public Duration timeout() {
        return audio.processTimeout();
    }
}
