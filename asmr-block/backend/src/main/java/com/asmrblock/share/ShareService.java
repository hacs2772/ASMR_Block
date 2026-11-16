package com.asmrblock.share;

import com.asmrblock.common.ApiException;
import com.asmrblock.config.AppProperties;
import com.asmrblock.playlist.Playlist;
import com.asmrblock.playlist.PlaylistBlock;
import com.asmrblock.playlist.PlaylistLayer;
import com.asmrblock.playlist.PlaylistService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.springframework.web.util.HtmlUtils;

import java.time.ZoneOffset;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;

/**
 * 조합 공유 링크 (https://asmrblock.com/s/{id}): 카톡·문자에 붙이면 미리보기 카드(조합 이름 · 블록 그림 · 한 줄 설명)가 나오고,
 * 사람이 누르면 바로 듣기 화면(/listen/{id})으로 넘어감. 공개 조합만 카드를 만들고, 아니면 사이트 기본 카드
 */
@Service
@RequiredArgsConstructor
public class ShareService {

    private final PlaylistService playlistService;
    private final AppProperties properties;

    /** 공개 조합 (아니거나 없으면 비어 있음) */
    public Optional<Playlist> publicPlaylist(Long id) {
        try {
            Playlist playlist = playlistService.getViewable(id, null);
            return Boolean.TRUE.equals(playlist.getIsPublic()) ? Optional.of(playlist) : Optional.empty();
        } catch (ApiException e) {
            return Optional.empty();
        }
    }

    public byte[] card(Long id) {
        Playlist playlist = publicPlaylist(id).orElseThrow(() -> ApiException.notFound("공개 조합이 아니에요."));
        return ShareCardRenderer.render(playlist);
    }

    /** 미리보기용 작은 HTML (og 태그) + 바로 듣기 화면으로 넘기기 */
    public String page(Long id) {
        String site = siteUrl();
        String listen = site + "/listen/" + id;
        Optional<Playlist> found = publicPlaylist(id);
        String title;
        String description;
        String image;
        if (found.isPresent()) {
            Playlist p = found.get();
            title = p.getTitle() + " · ASMR Block";
            description = describe(p);
            long version = p.getUpdatedAt() == null ? 0 : p.getUpdatedAt().toEpochSecond(ZoneOffset.UTC);
            image = site + "/s/" + id + "/card.png?v=" + version;
        } else {
            title = "ASMR Block — 나만의 팅글을 블록으로";
            description = "좋아하는 트리거 블록만 골라 딸깍 이어 붙이는, 나만의 ASMR 만들기";
            image = site + "/og-image.png";
        }
        String t = escape(title);
        String d = escape(description);
        String l = escape(listen);
        String u = escape(site + "/s/" + id);
        String i = escape(image);
        return """
                <!doctype html>
                <html lang="ko"><head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>%1$s</title>
                <meta name="description" content="%2$s">
                <meta property="og:type" content="website">
                <meta property="og:site_name" content="ASMR Block">
                <meta property="og:locale" content="ko_KR">
                <meta property="og:title" content="%1$s">
                <meta property="og:description" content="%2$s">
                <meta property="og:url" content="%4$s">
                <meta property="og:image" content="%5$s">
                <meta property="og:image:width" content="1200">
                <meta property="og:image:height" content="630">
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:title" content="%1$s">
                <meta name="twitter:description" content="%2$s">
                <meta name="twitter:image" content="%5$s">
                <link rel="canonical" href="%3$s">
                <meta http-equiv="refresh" content="0;url=%3$s">
                <style>body{margin:0;background:#0A0A0F;color:#ECECF1;font-family:sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center}a{color:#FF85AF}</style>
                </head><body>
                <p><a href="%3$s">조합 들으러 가기</a></p>
                <script>location.replace(%6$s)</script>
                </body></html>
                """.formatted(t, d, l, u, i, jsString(listen));
    }

    /** "블록 7개 · 한 바퀴 24분 · 탭핑·빗소리·귓속말 | @닉네임님이 쌓은 나만의 팅글" */
    static String describe(Playlist p) {
        int blocks = 0;
        Set<String> triggers = new LinkedHashSet<>();
        for (PlaylistLayer layer : p.getLayers()) {
            for (PlaylistBlock pb : layer.getBlocks()) {
                blocks += Math.max(1, pb.getRepeatCount() == null ? 1 : pb.getRepeatCount());
                if (pb.getBlock() != null && pb.getBlock().getCategory() != null && pb.getBlock().getCategory().getName() != null) {
                    triggers.add(pb.getBlock().getCategory().getName());
                }
            }
        }
        int minutes = (int) Math.max(1, Math.round((p.getTotalDuration() == null ? 0 : p.getTotalDuration()) / 60.0));
        String names = String.join("·", triggers.stream().limit(3).toList());
        StringBuilder sb = new StringBuilder("블록 ").append(blocks).append("개 · 한 바퀴 ").append(minutes).append("분");
        if (!names.isEmpty()) {
            sb.append(" · ").append(names);
        }
        if (p.getOwnerNickname() != null) {
            sb.append(" | @").append(p.getOwnerNickname()).append("님이 쌓은 나만의 팅글");
        }
        return sb.toString();
    }

    /** HTML 안에 넣을 글자 (꺾쇠·따옴표·&만 바꿈, 한글·가운뎃점은 그대로) */
    private static String escape(String value) {
        return HtmlUtils.htmlEscape(value, "UTF-8");
    }

    private String siteUrl() {
        String url = properties.site().configured() ? properties.site().url()
                : ServletUriComponentsBuilder.fromCurrentContextPath().toUriString();
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    /** 스크립트 안에 넣을 문자열 (따옴표·꺾쇠를 안전하게) */
    private static String jsString(String value) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : value.toCharArray()) {
            if (c == '"' || c == '\\' || c == '<' || c == '>' || c == '&' || c < 0x20) {
                sb.append(String.format("\\u%04x", (int) c));
            } else {
                sb.append(c);
            }
        }
        return sb.append('"').toString();
    }
}
