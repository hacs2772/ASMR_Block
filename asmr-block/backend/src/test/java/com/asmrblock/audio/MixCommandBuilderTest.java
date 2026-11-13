package com.asmrblock.audio;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

/** ffmpeg 없이 명령어 구성만 검사하는 단위 테스트 */
class MixCommandBuilderTest {

    private final MixCommandBuilder builder = new MixCommandBuilder(1.5, 3);
    private static final Path OUT = Path.of("/tmp/out.mp3");

    private static MixPlan.Clip clip(String name, int seconds, int repeat) {
        return new MixPlan.Clip(Path.of("/media/" + name + ".mp3"), seconds, repeat, null);
    }

    private static MixPlan.Clip at(String name, int seconds, int repeat, int start) {
        return new MixPlan.Clip(Path.of("/media/" + name + ".mp3"), seconds, repeat, start);
    }

    private static long inputs(MixCommandBuilder.Command command) {
        return command.args().stream().filter("-i"::equals).count();
    }

    private static String graph(MixCommandBuilder.Command command) {
        return command.args().get(command.args().indexOf("-filter_complex") + 1);
    }

    @Test
    @DisplayName("메인만: 반복을 풀어서 크로스페이드로 잇고, 길이는 겹친 만큼 줄어든다")
    void mainWithRepeat() {
        var command = builder.build(new MixPlan(
                new MixPlan.Layer(List.of(clip("a", 180, 2), clip("b", 240, 1)), 1.0), null, OUT));

        assertThat(inputs(command)).isEqualTo(3);
        assertThat(command.durationSeconds()).isCloseTo(600 - 3.0, within(0.001));
        assertThat(graph(command)).contains("acrossfade=d=1.500").doesNotContain("amix", "adelay");
        assertThat(command.args()).containsSequence("-progress", "pipe:1");
        assertThat(command.args().getLast()).isEqualTo("/tmp/out.mp3");
    }

    @Test
    @DisplayName("믹스 조각은 지정한 시각으로 밀고(adelay), 앞뒤 페이드 후 메인과 겹친다")
    void positionedMixClip() {
        var command = builder.build(new MixPlan(
                new MixPlan.Layer(List.of(clip("wind", 180, 3)), 0.8),
                new MixPlan.Layer(List.of(at("rain", 180, 1, 120), at("rain", 180, 1, 360)), 0.6),
                OUT));

        assertThat(inputs(command)).isEqualTo(3 + 2);
        // 메인은 537초(크로스페이드)에 끝나지만 믹스가 360+180=540초에 끝나서 전체 540초
        assertThat(command.durationSeconds()).isCloseTo(540.0, within(0.001));
        String graph = graph(command);
        assertThat(graph).contains("adelay=delays=120000:all=1", "adelay=delays=360000:all=1",
                "amix=inputs=2:duration=longest:normalize=0[xbus]", "volume=0.600", "volume=0.800",
                "amix=inputs=2:duration=longest:normalize=0[mix]", "alimiter");
    }

    @Test
    @DisplayName("믹스가 메인보다 늦게 끝나면 전체 길이는 믹스 끝")
    void mixExtendsBeyondMain() {
        var command = builder.build(new MixPlan(
                new MixPlan.Layer(List.of(clip("a", 60, 1)), 1.0),
                new MixPlan.Layer(List.of(at("b", 90, 2, 30)), 0.5),
                OUT));
        // 믹스 조각: 90 x 2 - 1.5 = 178.5초, 30초에 시작 → 208.5초
        assertThat(command.durationSeconds()).isCloseTo(208.5, within(0.001));
        assertThat(graph(command)).contains("afade=t=out:st=205.500");
    }

    @Test
    @DisplayName("1시간이 넘으면 비트레이트를 낮춰 파일 크기를 줄임, 8시간도 구성 가능")
    void longComposition() {
        var command = builder.build(new MixPlan(
                new MixPlan.Layer(List.of(clip("rain", 180, 160)), 1.0), null, OUT));
        assertThat(inputs(command)).isEqualTo(160);
        assertThat(command.durationSeconds()).isCloseTo(28800 - 159 * 1.5, within(0.001));
        assertThat(command.args()).containsSequence("-b:a", "128k");
        // 이음(크로스페이드)은 경계 수(159)만큼, 단 토너먼트로 합쳐서 8단계 깊이
        String graph = graph(command);
        assertThat(graph.split("acrossfade=").length - 1).isEqualTo(159);
        assertThat(graph).contains("[mr7n0]").doesNotContain("[mr8n0]");
    }

    @Test
    @DisplayName("입력이 너무 많으면 거부, 아주 짧은 블록은 크로스페이드를 줄임")
    void limits() {
        assertThatThrownBy(() -> builder.build(new MixPlan(
                new MixPlan.Layer(List.of(clip("a", 60, 200), clip("b", 60, 200), clip("c", 60, 200)), 1.0), null, OUT)))
                .isInstanceOf(AudioProcessingException.class);

        var command = builder.build(new MixPlan(
                new MixPlan.Layer(List.of(clip("a", 3, 2)), 1.0), null, OUT));
        assertThat(graph(command)).contains("acrossfade=d=1.000");
        assertThat(command.durationSeconds()).isCloseTo(5.0, within(0.001));
    }
}
