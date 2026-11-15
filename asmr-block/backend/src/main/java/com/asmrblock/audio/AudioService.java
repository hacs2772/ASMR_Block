package com.asmrblock.audio;

import com.asmrblock.config.AppProperties;
import org.springframework.stereotype.Service;

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
        ffmpeg.ffmpeg(List.of(
                "-i", input.toString(),
                "-vn", "-map", "0:a:0",
                "-af", String.format(Locale.ROOT, "loudnorm=I=%.1f:TP=-2:LRA=11,aresample=44100", audio.targetLufs()),
                "-ac", "2", "-c:a", "libmp3lame", "-b:a", "192k",
                output.toString()), audio.processTimeout());
        return duration(output);
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

    public int duration(Path file) {
        return ffmpeg.probeDurationSeconds(file);
    }

    public Duration timeout() {
        return audio.processTimeout();
    }
}
