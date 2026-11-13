package com.asmrblock.audio;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * MixPlan → ffmpeg 인자 목록 (실행은 FfmpegRunner).
 *
 * 처리 순서
 *  1. 모든 입력을 44.1kHz 스테레오로 맞춤
 *  2. 동마다 블록을 크로스페이드로 이어 붙임 (끊김 없이)
 *  3. 배경 동이 짧고 반복 설정이면 메인 길이만큼 반복 후 자름
 *  4. 동별 볼륨 적용 → 겹치기(amix)
 *  5. 리미터로 소리 깨짐(클리핑) 방지 → 전체 앞뒤 페이드
 */
public final class MixCommandBuilder {

    /** 반복으로 너무 많은 입력이 생기는 것 방지 (3분 블록 기준 약 10시간) */
    static final int MAX_INPUTS = 200;

    private final double crossfadeSeconds;
    private final double fadeSeconds;

    public MixCommandBuilder(double crossfadeSeconds, double fadeSeconds) {
        this.crossfadeSeconds = crossfadeSeconds;
        this.fadeSeconds = fadeSeconds;
    }

    public record Command(List<String> args, double durationSeconds) {
    }

    public Command build(MixPlan plan) {
        Graph graph = new Graph();

        Chain main = graph.chain(plan.main().tracks(), "m");
        double total = main.length();
        String mainOut = graph.volume(main.label(), plan.main().volume(), "mv");

        String mixed;
        if (plan.background() == null) {
            mixed = mainOut;
        } else {
            MixPlan.Layer bg = plan.background();
            Chain background;
            if (bg.loopToFill()) {
                background = graph.chain(repeatToCover(bg.tracks(), main.length()), "b");
                background = graph.trim(background, main.length());
            } else {
                background = graph.chain(bg.tracks(), "b");
                total = Math.max(total, background.length());
            }
            String bgOut = graph.volume(background.label(), bg.volume(), "bv");
            mixed = graph.mix(mainOut, bgOut);
        }

        double fade = Math.min(fadeSeconds, total / 4);
        graph.filters.add("[%s]alimiter=limit=0.891:attack=5:release=50:level=0,afade=t=in:d=%s,afade=t=out:st=%s:d=%s[out]"
                .formatted(mixed, num(fade), num(total - fade), num(fade)));

        List<String> args = new ArrayList<>(graph.inputArgs);
        args.addAll(List.of(
                "-filter_complex", String.join(";", graph.filters),
                "-map", "[out]",
                "-ar", "44100", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "160k",
                plan.output().toString()));
        return new Command(args, total);
    }

    /** 트랙 목록을 처음부터 반복해서 target 초를 덮을 만큼 늘림 (크로스페이드로 줄어드는 길이 고려) */
    List<MixPlan.Track> repeatToCover(List<MixPlan.Track> tracks, double target) {
        List<MixPlan.Track> result = new ArrayList<>();
        double length = 0;
        double crossfade = effectiveCrossfade(tracks);
        int i = 0;
        while (length < target && result.size() < MAX_INPUTS) {
            MixPlan.Track track = tracks.get(i % tracks.size());
            length += result.isEmpty() ? track.durationSeconds() : track.durationSeconds() - crossfade;
            result.add(track);
            i++;
        }
        return result;
    }

    /** 블록이 아주 짧으면 크로스페이드를 줄임 (블록 길이의 1/3 이하) */
    double effectiveCrossfade(List<MixPlan.Track> tracks) {
        int shortest = tracks.stream().mapToInt(MixPlan.Track::durationSeconds).min().orElse(0);
        return Math.min(crossfadeSeconds, shortest / 3.0);
    }

    private static String num(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }

    private record Chain(String label, double length) {
    }

    /** filter_complex 그래프를 만들어가는 도우미 */
    private final class Graph {
        final List<String> inputArgs = new ArrayList<>();
        final List<String> filters = new ArrayList<>();
        int inputCount = 0;

        Chain chain(List<MixPlan.Track> tracks, String prefix) {
            if (inputCount + tracks.size() > MAX_INPUTS) {
                throw new AudioProcessingException("블록이 너무 많습니다. (최대 " + MAX_INPUTS + "개)");
            }
            double crossfade = effectiveCrossfade(tracks);
            List<String> labels = new ArrayList<>();
            double length = 0;
            for (MixPlan.Track track : tracks) {
                int index = inputCount++;
                inputArgs.addAll(List.of("-i", track.file().toString()));
                String label = prefix + "in" + index;
                filters.add("[%d:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[%s]"
                        .formatted(index, label));
                labels.add(label);
                length += track.durationSeconds();
            }
            if (labels.size() == 1) {
                return new Chain(labels.getFirst(), length);
            }

            String current = labels.getFirst();
            for (int i = 1; i < labels.size(); i++) {
                String next = prefix + "x" + i;
                if (crossfade > 0) {
                    filters.add("[%s][%s]acrossfade=d=%s:c1=qsin:c2=qsin[%s]"
                            .formatted(current, labels.get(i), num(crossfade), next));
                } else {
                    filters.add("[%s][%s]concat=n=2:v=0:a=1[%s]".formatted(current, labels.get(i), next));
                }
                current = next;
            }
            return new Chain(current, length - crossfade * (labels.size() - 1));
        }

        Chain trim(Chain chain, double seconds) {
            String label = chain.label() + "t";
            filters.add("[%s]atrim=end=%s,asetpts=PTS-STARTPTS[%s]".formatted(chain.label(), num(seconds), label));
            return new Chain(label, Math.min(chain.length(), seconds));
        }

        String volume(String input, double volume, String label) {
            filters.add("[%s]volume=%s[%s]".formatted(input, num(volume), label));
            return label;
        }

        String mix(String first, String second) {
            filters.add("[%s][%s]amix=inputs=2:duration=longest:normalize=0[mix]".formatted(first, second));
            return "mix";
        }
    }
}
