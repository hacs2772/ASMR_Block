package com.asmrblock.audio;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/** ffmpeg 없이 명령어 구성만 검사하는 단위 테스트 */
class MixCommandBuilderTest {

    private final MixCommandBuilder builder = new MixCommandBuilder(1.5, 3);

    private static MixPlan.Track track(String name, int seconds) {
        return new MixPlan.Track(Path.of("/media/" + name + ".mp3"), seconds);
    }

    @Test
    @DisplayName("메인만: 블록을 크로스페이드로 잇고, 길이는 겹친 만큼 줄어든다")
    void mainOnly() {
        var command = builder.build(new MixPlan(
                new MixPlan.Layer(List.of(track("a", 180), track("b", 240), track("a", 180)), 1.0, false),
                null, Path.of("/tmp/out.mp3")));

        assertThat(command.durationSeconds()).isCloseTo(600 - 3.0, within(0.001));
        assertThat(command.args().stream().filter("-i"::equals).count()).isEqualTo(3);
        String graph = filterGraph(command);
        assertThat(graph).contains("acrossfade=d=1.500").doesNotContain("amix");
        assertThat(command.args().getLast()).isEqualTo("/tmp/out.mp3");
    }

    @Test
    @DisplayName("배경 반복: 메인 길이를 덮을 만큼 반복한 뒤 메인 길이로 자르고 겹친다")
    void loopingBackground() {
        var command = builder.build(new MixPlan(
                new MixPlan.Layer(List.of(track("main", 180), track("main", 180), track("main", 180)), 0.8, false),
                new MixPlan.Layer(List.of(track("rain", 100)), 0.4, true),
                Path.of("/tmp/out.mp3")));

        double mainLength = 540 - 3.0;
        assertThat(command.durationSeconds()).isCloseTo(mainLength, within(0.001));
        // 100초 블록을 크로스페이드 1.5초로 이으면 6개 = 100 + 5*98.5 = 592.5초 ≥ 537초
        assertThat(command.args().stream().filter("-i"::equals).count()).isEqualTo(3 + 6);
        String graph = filterGraph(command);
        assertThat(graph).contains("atrim=end=537.000", "volume=0.800", "volume=0.400",
                "amix=inputs=2:duration=longest:normalize=0", "alimiter", "afade=t=out:st=534.000");
    }

    @Test
    @DisplayName("반복하지 않는 배경이 더 길면 전체 길이는 배경 길이")
    void longerBackgroundWithoutLoop() {
        var command = builder.build(new MixPlan(
                new MixPlan.Layer(List.of(track("a", 60)), 1.0, false),
                new MixPlan.Layer(List.of(track("b", 90), track("b", 90)), 0.5, false),
                Path.of("/tmp/out.mp3")));
        assertThat(command.durationSeconds()).isCloseTo(180 - 1.5, within(0.001));
        assertThat(filterGraph(command)).doesNotContain("atrim");
    }

    @Test
    @DisplayName("아주 짧은 블록은 크로스페이드를 블록 길이의 1/3로 줄인다")
    void shortBlocksReduceCrossfade() {
        var command = builder.build(new MixPlan(
                new MixPlan.Layer(List.of(track("a", 3), track("b", 3)), 1.0, false),
                null, Path.of("/tmp/out.mp3")));
        assertThat(filterGraph(command)).contains("acrossfade=d=1.000");
        assertThat(command.durationSeconds()).isCloseTo(5.0, within(0.001));
    }

    private static String filterGraph(MixCommandBuilder.Command command) {
        return command.args().get(command.args().indexOf("-filter_complex") + 1);
    }
}
