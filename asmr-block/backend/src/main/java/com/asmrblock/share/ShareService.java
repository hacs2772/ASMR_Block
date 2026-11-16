package com.asmrblock.share;

import com.asmrblock.block.Block;
import com.asmrblock.block.BlockMapper;
import com.asmrblock.block.BlockSearchCondition;
import com.asmrblock.block.BlockStatus;
import com.asmrblock.common.ApiException;
import com.asmrblock.config.AppProperties;
import com.asmrblock.creator.CreatorDtos.CreatorResponse;
import com.asmrblock.creator.CreatorService;
import com.asmrblock.i18n.Lang;
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
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * 조합 공유 링크 (https://asmrblock.com/s/{id}): 카톡·문자에 붙이면 미리보기 카드(조합 이름 · 블록 그림 · 한 줄 설명)가 나오고,
 * 사람이 누르면 바로 듣기 화면(/listen/{id})으로 넘어감. 공개 조합만 카드를 만들고, 아니면 사이트 기본 카드.
 * 블록(/s/b/{id}) → 크리에이터 페이지에서 그 블록을 맨 위에, 크리에이터(/s/c/{id}) → 크리에이터 페이지
 */
@Service
@RequiredArgsConstructor
public class ShareService {

    private final PlaylistService playlistService;
    private final AppProperties properties;
    private final BlockMapper blockMapper;
    private final CreatorService creatorService;

    private static final String DEFAULT_TITLE = "ASMR Block — 나만의 팅글을 블록으로";
    private static final String DEFAULT_DESCRIPTION = "좋아하는 트리거 블록만 골라 딸깍 이어 붙이는, 나만의 ASMR 만들기";
    private static final String DEFAULT_TITLE_EN = "ASMR Block — your own tingles, block by block";
    private static final String DEFAULT_DESCRIPTION_EN = "Pick the trigger blocks you love and click them together into your own ASMR";

    /*
     * 영어판: 영어 화면에서 공유한 링크는 끝에 ?lang=en (카톡은 주소마다 미리보기를 따로 기억하니 언어마다 주소가 달라야 함).
     * 그 요청은 Lang이 en → 미리보기 글·이름(영어 이름이 있으면)·넘어가는 주소(?lang=en)가 영어
     */
    private static String t(String ko, String en) {
        return Lang.english() ? en : ko;
    }

    private static String withLang(String url) {
        return Lang.english() ? url + (url.contains("?") ? "&" : "?") + "lang=en" : url;
    }

    private static String defaultTitle() {
        return t(DEFAULT_TITLE, DEFAULT_TITLE_EN);
    }

    private static String defaultDescription() {
        return t(DEFAULT_DESCRIPTION, DEFAULT_DESCRIPTION_EN);
    }

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

    /** 조합: 미리보기용 작은 HTML (og 태그) + 바로 듣기 화면으로 넘기기 */
    public String page(Long id) {
        String site = siteUrl();
        Optional<Playlist> found = publicPlaylist(id);
        if (found.isEmpty()) {
            return html(defaultTitle(), defaultDescription(), site + "/og-image.png", site + "/listen/" + id, site + "/s/" + id,
                    t("조합 들으러 가기", "Listen to the combo"));
        }
        Playlist p = found.get();
        long version = p.getUpdatedAt() == null ? 0 : p.getUpdatedAt().toEpochSecond(ZoneOffset.UTC);
        return html(Lang.pick(p.getTitle(), p.getTitleEn()) + " · ASMR Block", describe(p), site + "/s/" + id + "/card.png?v=" + version,
                site + "/listen/" + id, site + "/s/" + id, t("조합 들으러 가기", "Listen to the combo"));
    }

    /** 공유할 수 있는 블록 (승인·활성). 아니면 비어 있음 */
    public Optional<Block> sharedBlock(Long id) {
        return blockMapper.findById(id).filter(b -> b.getStatus() == BlockStatus.APPROVED);
    }

    /** 블록: 카드 = 큰 블록 하나, 누르면 크리에이터 페이지에서 그 블록이 맨 위에 */
    public String blockPage(Long id) {
        String site = siteUrl();
        Optional<Block> found = sharedBlock(id);
        if (found.isEmpty()) {
            return html(defaultTitle(), defaultDescription(), site + "/og-image.png", site + "/shop", site + "/s/b/" + id,
                    t("블록 상점으로 가기", "Go to the Block Shop"));
        }
        Block b = found.get();
        long version = b.getUpdatedAt() == null ? 0 : b.getUpdatedAt().toEpochSecond(ZoneOffset.UTC);
        return html(Lang.pick(b.getTitle(), b.getTitleEn()) + " · ASMR Block", describeBlock(b), site + "/s/b/" + id + "/card.png?v=" + version,
                site + "/creator/" + b.getUploaderId() + "?block=" + id, site + "/s/b/" + id, t("블록 들으러 가기", "Listen to the block"));
    }

    public byte[] blockCard(Long id) {
        return ShareCardRenderer.renderBlock(sharedBlock(id).orElseThrow(() -> ApiException.notFound("공유할 수 없는 블록이에요.")));
    }

    /** 크리에이터: 카드 = 그 사람이 올린 블록들, 누르면 크리에이터 페이지 */
    public String creatorPage(Long userId) {
        String site = siteUrl();
        String target = site + "/creator/" + userId;
        try {
            CreatorResponse c = creatorService.get(userId);
            StringBuilder d = new StringBuilder(Lang.english()
                    ? c.blockCount() + (c.blockCount() == 1 ? " block" : " blocks") : "블록 " + c.blockCount() + "개");
            if (!c.triggers().isEmpty()) {
                d.append(" · ").append(String.join("·", c.triggers()));
            }
            d.append(t(" | 좋아하는 트리거만 골라 쌓는 나만의 ASMR", " | Build your own ASMR from the triggers you love"));
            return html(t("@" + c.nickname() + "의 ASMR 블록 · ASMR Block", "ASMR blocks by @" + c.nickname() + " · ASMR Block"), d.toString(),
                    site + "/s/c/" + userId + "/card.png?v=" + c.blockCount(), target, site + "/s/c/" + userId, t("블록 보러 가기", "See the blocks"));
        } catch (ApiException e) {
            return html(defaultTitle(), defaultDescription(), site + "/og-image.png", site + "/shop", site + "/s/c/" + userId,
                    t("블록 상점으로 가기", "Go to the Block Shop"));
        }
    }

    public byte[] creatorCard(Long userId) {
        creatorService.get(userId); // 없는 사람이면 404
        List<Block> blocks = blockMapper.search(BlockSearchCondition.builder()
                .uploaderId(userId).status(BlockStatus.APPROVED).listedOnly(true).sort("popular").offset(0).limit(24).build());
        return ShareCardRenderer.renderCreator(blocks);
    }

    /** og·twitter 태그 + 사람은 바로 target으로 넘김 */
    private String html(String title, String description, String image, String rawTarget, String rawSelf, String linkText) {
        String target = withLang(rawTarget);
        String self = withLang(rawSelf);
        String t = escape(title);
        String d = escape(description);
        String l = escape(target);
        String u = escape(self);
        String i = escape(image);
        return """
                <!doctype html>
                <html lang="%8$s"><head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>%1$s</title>
                <meta name="description" content="%2$s">
                <meta property="og:type" content="website">
                <meta property="og:site_name" content="ASMR Block">
                <meta property="og:locale" content="%9$s">
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
                <p><a href="%3$s">%7$s</a></p>
                <script>location.replace(%6$s)</script>
                </body></html>
                """.formatted(t, d, l, u, i, jsString(target), escape(linkText), Lang.current(), Lang.english() ? "en_US" : "ko_KR");
    }

    /** "탭핑 · 3분 20초 · 노토킹 | @닉네임 · 도쿄 신주쿠역 앞" */
    static String describeBlock(Block b) {
        StringBuilder sb = new StringBuilder();
        if (b.getCategory() != null) {
            String group = b.getCategory().getParentName() != null
                    ? Lang.pick(b.getCategory().getParentName(), b.getCategory().getParentNameEn())
                    : Lang.pick(b.getCategory().getName(), b.getCategory().getNameEn());
            if (group != null) {
                sb.append(group).append(" · ");
            }
        }
        int seconds = b.getDuration() == null ? 0 : b.getDuration();
        sb.append(seconds / 60).append(t("분", " min"));
        if (seconds % 60 > 0) {
            sb.append(" ").append(seconds % 60).append(t("초", " sec"));
        }
        if (b.getTalkType() != null) {
            sb.append(" · ").append(switch (b.getTalkType()) {
                case NONE -> t("노토킹", "No talking");
                case WHISPER -> t("속삭임", "Whisper");
                case TALK -> t("말하기", "Talking");
            });
        }
        if (b.getUploaderNickname() != null) {
            sb.append(" | @").append(b.getUploaderNickname());
        }
        String place = Lang.pick(b.getRecordedPlace(), b.getRecordedPlaceEn());
        if (place != null && !place.isBlank()) {
            sb.append(" · ").append(place);
        }
        return sb.toString();
    }

    /** "블록 7개 · 한 바퀴 24분 · 탭핑·빗소리·귓속말 | @닉네임님이 쌓은 나만의 팅글" */
    static String describe(Playlist p) {
        int blocks = 0;
        Set<String> triggers = new LinkedHashSet<>();
        for (PlaylistLayer layer : p.getLayers()) {
            for (PlaylistBlock pb : layer.getBlocks()) {
                blocks += Math.max(1, pb.getRepeatCount() == null ? 1 : pb.getRepeatCount());
                if (pb.getBlock() != null && pb.getBlock().getCategory() != null && pb.getBlock().getCategory().getName() != null) {
                    triggers.add(Lang.pick(pb.getBlock().getCategory().getName(), pb.getBlock().getCategory().getNameEn()));
                }
            }
        }
        int minutes = (int) Math.max(1, Math.round((p.getTotalDuration() == null ? 0 : p.getTotalDuration()) / 60.0));
        String names = String.join("·", triggers.stream().limit(3).toList());
        StringBuilder sb = new StringBuilder(Lang.english()
                ? blocks + (blocks == 1 ? " block · " : " blocks · ") + minutes + " min loop"
                : "블록 " + blocks + "개 · 한 바퀴 " + minutes + "분");
        if (!names.isEmpty()) {
            sb.append(" · ").append(names);
        }
        if (p.getOwnerNickname() != null) {
            sb.append(Lang.english() ? " | Tingles stacked by @" + p.getOwnerNickname() : " | @" + p.getOwnerNickname() + "님이 쌓은 나만의 팅글");
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
