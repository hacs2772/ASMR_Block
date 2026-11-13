package com.asmrblock.audio;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * MixPlan → ffmpeg 인자 목록 (실행은 FfmpegRunner).
 *
 * 처리 순서
 *  1. 모든 입력을 44.1kHz 스테레오로 맞춤
 *  2. 메인 트랙: 조각(블록 x 반복)을 크로스페이드로 끊김 없이 이어 붙임
 *  3. 믹스 트랙: 조각마다 앞뒤 페이드를 주고 지정한 시각으로 밀어서(adelay) 겹칠 준비 → 사이사이는 빈칸(무음)
 *  4. 트랙별 볼륨 → 겹치기(amix)
 *  5. 리미터로 소리 깨짐(클리핑) 방지 → 전체 앞뒤 페이드
 *  진행률은 -progress 출력(out_time_us)으로 FfmpegRunner가 읽음
 */
public final class MixCommandBuilder {

    /** 입력 파일 개수 상한 (반복 포함). 3분 블록 기준 메인+믹스 합쳐 약 25시간 분량 */
    static final int MAX_INPUTS = 500;
    /** 1시간이 넘으면 파일 크기를 줄이려고 비트레이트를 낮춤 */
    static final int LONG_SECONDS = 60 * 60;
    /** 믹스 조각이 섞여 들어오고 빠질 때 페이드 */
    static final double MIX_EDGE_FADE_SECONDS = 2.0;

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

        Chain main = graph.chain(expand(plan.main().clips()), "m");
        double total = main.length();
        String mixed = graph.volume(main.label(), plan.main().volume(), "mv");

        if (plan.mix() != null) {
            List<String> pieces = new ArrayList<>();
            int index = 0;
            for (MixPlan.Clip clip : plan.mix().clips()) {
                Chain piece = graph.chain(expand(List.of(clip)), "x" + index + "_");
                double start = clip.start() == null ? 0 : clip.start();
                pieces.add(graph.placeAt(piece, start, "xp" + index));
                total = Math.max(total, start + piece.length());
                index++;
            }
            String mixBus = pieces.size() == 1 ? pieces.getFirst() : graph.amix(pieces, "xbus");
            String mixOut = graph.volume(mixBus, plan.mix().volume(), "xv");
            mixed = graph.amix(List.of(mixed, mixOut), "mix");
        }

        double fade = Math.min(fadeSeconds, total / 4);
        graph.filters.add("[%s]alimiter=limit=0.891:attack=5:release=50:level=0,afade=t=in:d=%s,afade=t=out:st=%s:d=%s[out]"
                .formatted(mixed, num(fade), num(total - fade), num(fade)));

        List<String> args = new ArrayList<>(graph.inputArgs);
        args.addAll(List.of(
                "-filter_complex", String.join(";", graph.filters),
                "-map", "[out]",
                "-ar", "44100", "-ac", "2", "-c:a", "libmp3lame",
                "-b:a", total > LONG_SECONDS ? "128k" : "160k",
                "-progress", "pipe:1", "-nostats",
                plan.output().toString()));
        return new Command(args, total);
    }

    /** 반복을 풀어서 (파일, 길이) 목록으로 */
    static List<Track> expand(List<MixPlan.Clip> clips) {
        List<Track> tracks = new ArrayList<>();
        for (MixPlan.Clip clip : clips) {
            tracks.addAll(Collections.nCopies(clip.repeat(), new Track(clip.file(), clip.durationSeconds())));
        }
        return tracks;
    }

    record Track(Path file, int durationSeconds) {
    }

    /** 블록이 아주 짧으면 크로스페이드를 줄임 (블록 길이의 1/3 이하) */
    double effectiveCrossfade(List<Track> tracks) {
        int shortest = tracks.stream().mapToInt(Track::durationSeconds).min().orElse(0);
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

        /** 트랙들을 순서대로 크로스페이드로 이어 붙임 */
        Chain chain(List<Track> tracks, String prefix) {
            if (inputCount + tracks.size() > MAX_INPUTS) {
                throw new AudioProcessingException("블록이 너무 많습니다. (반복 포함 최대 " + MAX_INPUTS + "개)");
            }
            double crossfade = effectiveCrossfade(tracks);
            List<String> labels = new ArrayList<>();
            double length = 0;
            for (Track track : tracks) {
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
            // 토너먼트처럼 이웃끼리 짝지어 합침: 한 줄로 이으면 첫 블록 소리가 이음 필터를 n번 지나가서
            // 블록이 많을수록 제곱으로 느려짐 (8시간 = 160블록이면 수십 분). 짝지어 합치면 log2(n)번만 지나감.
            // 결과는 같음: 이웃한 두 블록 경계마다 크로스페이드 한 번
            List<String> level = labels;
            int round = 0;
            while (level.size() > 1) {
                List<String> next = new ArrayList<>();
                for (int i = 0; i + 1 < level.size(); i += 2) {
                    String out = prefix + "r" + round + "n" + i;
                    if (crossfade > 0) {
                        filters.add("[%s][%s]acrossfade=d=%s:c1=qsin:c2=qsin[%s]"
                                .formatted(level.get(i), level.get(i + 1), num(crossfade), out));
                    } else {
                        filters.add("[%s][%s]concat=n=2:v=0:a=1[%s]".formatted(level.get(i), level.get(i + 1), out));
                    }
                    next.add(out);
                }
                if (level.size() % 2 == 1) {
                    next.add(level.getLast());
                }
                level = next;
                round++;
            }
            return new Chain(level.getFirst(), length - crossfade * (labels.size() - 1));
        }

        /** 믹스 조각: 앞뒤로 부드럽게 들어오고 빠지게 한 뒤 start초 위치로 밀기 */
        String placeAt(Chain piece, double startSeconds, String label) {
            double edge = Math.min(MIX_EDGE_FADE_SECONDS, piece.length() / 4);
            long delayMs = Math.round(startSeconds * 1000);
            filters.add("[%s]afade=t=in:d=%s,afade=t=out:st=%s:d=%s,adelay=delays=%d:all=1[%s]"
                    .formatted(piece.label(), num(edge), num(piece.length() - edge), num(edge), delayMs, label));
            return label;
        }

        String volume(String input, double volume, String label) {
            filters.add("[%s]volume=%s[%s]".formatted(input, num(volume), label));
            return label;
        }

        String amix(List<String> inputs, String label) {
            StringBuilder sb = new StringBuilder();
            inputs.forEach(in -> sb.append('[').append(in).append(']'));
            filters.add("%samix=inputs=%d:duration=longest:normalize=0[%s]".formatted(sb, inputs.size(), label));
            return label;
        }
    }
}
