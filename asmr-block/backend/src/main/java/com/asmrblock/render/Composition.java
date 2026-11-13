package com.asmrblock.render;

import com.asmrblock.common.ApiException;
import com.asmrblock.playlist.LayerRole;
import com.asmrblock.playlist.Playlist;
import com.asmrblock.playlist.PlaylistLayer;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * 완성본을 만드는 데 필요한 정보만 뽑은 것 (어떤 파일을, 어떤 순서·반복·위치·볼륨으로).
 * 제목 등은 빠져 있으므로, 서로 다른 플레이리스트라도 구성이 같으면 해시가 같아 파일을 재사용합니다.
 */
public record Composition(Layer main, Layer mix) {

    /** 믹싱 방식(크로스페이드, 리미터 등)을 바꾸면 올려서 기존 완성본을 무효화 */
    static final String MIX_VERSION = "mix-v2";

    /** start: 믹스 트랙의 시작 시각(초), 메인 트랙은 null */
    public record Clip(String fileKey, int duration, int repeat, Integer start) {
    }

    public record Layer(List<Clip> clips, double volume) {
    }

    public static Composition of(Playlist playlist) {
        Layer main = playlist.layer(LayerRole.MAIN).map(Composition::layerOf).orElse(null);
        if (main == null || main.clips().isEmpty()) {
            throw ApiException.badRequest("재생할 수 있는 블록이 없습니다.");
        }
        Layer mix = playlist.layer(LayerRole.MIX).map(Composition::layerOf)
                .filter(layer -> !layer.clips().isEmpty())
                .orElse(null);
        return new Composition(main, mix);
    }

    private static Layer layerOf(PlaylistLayer layer) {
        boolean positioned = layer.getRole() == LayerRole.MIX;
        List<Clip> clips = layer.getBlocks().stream()
                .filter(pb -> pb.getBlock().isPlayable()) // 비활성화/검수 취소된 블록은 빼고 만듦
                .map(pb -> new Clip(pb.getBlock().getFileKey(), pb.getBlock().getDuration(), pb.getRepeatCount(),
                        positioned ? pb.getStartSeconds() : null))
                .toList();
        return new Layer(clips, layer.getVolume());
    }

    public String hash() {
        String canonical = MIX_VERSION + "|M:" + describe(main) + "|X:" + (mix == null ? "-" : describe(mix));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String describe(Layer layer) {
        return String.format(Locale.ROOT, "%.2f;", layer.volume())
                + layer.clips().stream()
                .map(c -> c.fileKey() + "@" + c.duration() + "x" + c.repeat() + (c.start() == null ? "" : "+" + c.start()))
                .collect(Collectors.joining(","));
    }
}
