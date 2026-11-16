package com.asmrblock.audio;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** ffmpeg 안전장치 (DB 없이 빠르게) */
class FfmpegSafetyTest {

    @Test
    @DisplayName("모든 입력(-i) 앞에 -protocol_whitelist file")
    void localFilesOnly() {
        assertThat(FfmpegRunner.localFilesOnly(List.of("-ss", "1", "-i", "a.mp3", "-i", "b.mp3", "out.mp3")))
                .containsExactly("-ss", "1", "-protocol_whitelist", "file", "-i", "a.mp3",
                        "-protocol_whitelist", "file", "-i", "b.mp3", "out.mp3");
    }

    @Test
    @DisplayName("형식 이름: 소리·영상·사진만 통과, 재생목록(hls)·이어 붙이기(concat)·글자(tty)는 막힘")
    void formats() {
        assertThat(AudioService.isAllowed("mp3", AudioService.SOUND_FORMATS)).isTrue();
        assertThat(AudioService.isAllowed("mov,mp4,m4a,3gp,3g2,mj2", AudioService.SOUND_FORMATS)).isTrue();
        assertThat(AudioService.isAllowed("matroska,webm", AudioService.VIDEO_FORMATS)).isTrue();
        assertThat(AudioService.isAllowed("png_pipe", AudioService.IMAGE_FORMATS)).isTrue();
        for (String bad : List.of("hls", "concat", "tty", "png_pipe", "", "image2")) {
            assertThat(AudioService.isAllowed(bad, AudioService.SOUND_FORMATS)).as(bad).isFalse();
        }
        assertThat(AudioService.isAllowed("mp3", Set.of("image2"))).isFalse();
        assertThat(AudioService.isAllowed(null, AudioService.SOUND_FORMATS)).isFalse();
    }
}
