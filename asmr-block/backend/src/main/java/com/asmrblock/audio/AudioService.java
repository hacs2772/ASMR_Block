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

    public int duration(Path file) {
        return ffmpeg.probeDurationSeconds(file);
    }

    public Duration timeout() {
        return audio.processTimeout();
    }
}
