package com.asmrblock.render;

import com.asmrblock.common.ApiException;
import com.asmrblock.playlist.LayerRole;
import com.asmrblock.playlist.Playlist;
import com.asmrblock.playlist.PlaylistBlock;
import com.asmrblock.playlist.PlaylistLayer;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * 완성본을 만드는 데 필요한 정보만 뽑은 것 (어떤 파일을, 어떤 순서·볼륨·반복으로).
 * 제목 등은 빠져 있으므로, 서로 다른 플레이리스트라도 구성이 같으면 해시가 같아 파일을 재사용합니다.
 */
public record Composition(Layer main, Layer background) {

    /** 믹싱 방식(크로스페이드, 리미터 등)을 바꾸면 올려서 기존 완성본을 무효화 */
    static final String MIX_VERSION = "mix-v1";

    public record Track(String fileKey, int duration) {
    }

    public record Layer(List<Track> tracks, double volume, boolean loop) {
    }

    public static Composition of(Playlist playlist) {
        Layer main = playlist.layer(LayerRole.MAIN).map(Composition::layerOf).orElse(null);
        if (main == null || main.tracks().isEmpty()) {
            throw ApiException.badRequest("재생할 수 있는 블록이 없습니다.");
        }
        Layer background = playlist.layer(LayerRole.BACKGROUND).map(Composition::layerOf)
                .filter(layer -> !layer.tracks().isEmpty())
                .orElse(null);
        return new Composition(main, background);
    }

    private static Layer layerOf(PlaylistLayer layer) {
        List<Track> tracks = layer.getBlocks().stream()
                .map(PlaylistBlock::getBlock)
                .filter(block -> block.isPlayable()) // 비활성화/검수 취소된 블록은 빼고 만듦
                .map(block -> new Track(block.getFileKey(), block.getDuration()))
                .toList();
        boolean loop = layer.getRole() == LayerRole.BACKGROUND && Boolean.TRUE.equals(layer.getLoopToFill());
        return new Layer(tracks, layer.getVolume(), loop);
    }

    public String hash() {
        String canonical = MIX_VERSION + "|M:" + describe(main) + "|B:" + (background == null ? "-" : describe(background));
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String describe(Layer layer) {
        return String.format(Locale.ROOT, "%.2f;%s;", layer.volume(), layer.loop())
                + layer.tracks().stream().map(t -> t.fileKey() + "@" + t.duration()).collect(Collectors.joining(","));
    }
}
