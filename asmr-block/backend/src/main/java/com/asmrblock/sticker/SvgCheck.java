package com.asmrblock.sticker;

import com.asmrblock.common.ApiException;

import java.util.List;
import java.util.regex.Pattern;

/**
 * 관리자가 올린 SVG 검사. 웹은 <img>로, 앱은 react-native-svg로 그리지만
 * 혹시 모를 위험(스크립트·외부 주소)과 앱에서 안 그려지는 것(style 태그)은 미리 막음
 */
final class SvgCheck {

    static final int MAX_BYTES = 30 * 1024;

    private static final Pattern XML_DECL = Pattern.compile("^\\s*<\\?xml[^>]*\\?>", Pattern.CASE_INSENSITIVE);
    private static final Pattern COMMENT = Pattern.compile("<!--.*?-->", Pattern.DOTALL);
    private static final Pattern VIEW_BOX = Pattern.compile("<svg\\b[^>]*\\bviewBox\\s*=", Pattern.CASE_INSENSITIVE);
    private static final List<Rule> RULES = List.of(
            new Rule(Pattern.compile("<\\s*script", Pattern.CASE_INSENSITIVE), "script는 넣을 수 없어요."),
            new Rule(Pattern.compile("<!\\s*(doctype|entity)", Pattern.CASE_INSENSITIVE), "DOCTYPE·ENTITY는 넣을 수 없어요."),
            new Rule(Pattern.compile("<\\s*foreignObject", Pattern.CASE_INSENSITIVE), "foreignObject는 넣을 수 없어요."),
            new Rule(Pattern.compile("<\\s*(image|use)\\b", Pattern.CASE_INSENSITIVE), "다른 그림을 불러오는 image·use 태그는 넣을 수 없어요."),
            new Rule(Pattern.compile("<\\s*style", Pattern.CASE_INSENSITIVE), "style 태그는 앱에서 안 그려져요. 색은 fill 속성으로 넣어 주세요."),
            new Rule(Pattern.compile("\\son[a-z]+\\s*=", Pattern.CASE_INSENSITIVE), "onclick 같은 이벤트 속성은 넣을 수 없어요."),
            new Rule(Pattern.compile("javascript:", Pattern.CASE_INSENSITIVE), "javascript 주소는 넣을 수 없어요."),
            new Rule(Pattern.compile("href\\s*=\\s*[\"']\\s*[^\"'#\\s]", Pattern.CASE_INSENSITIVE), "외부 주소(href)는 넣을 수 없어요."),
            new Rule(Pattern.compile("url\\(\\s*[\"']?\\s*[^\"'#\\s)]", Pattern.CASE_INSENSITIVE), "외부 주소(url)는 넣을 수 없어요."));

    private SvgCheck() {
    }

    /** 검사 후 앞뒤 정리한 SVG 글자 (xml 선언·주석 제거) */
    static String clean(byte[] bytes) {
        if (bytes.length > MAX_BYTES) {
            throw ApiException.badRequest("SVG 파일은 %dKB까지 올릴 수 있어요.".formatted(MAX_BYTES / 1024));
        }
        String svg = new String(bytes, java.nio.charset.StandardCharsets.UTF_8).replace("\uFEFF", "");
        svg = COMMENT.matcher(XML_DECL.matcher(svg).replaceFirst("")).replaceAll("").trim();
        if (!svg.regionMatches(true, 0, "<svg", 0, 4) || !svg.toLowerCase().endsWith("</svg>")) {
            throw ApiException.badRequest("이 SVG는 쓸 수 없어요: <svg>로 시작하고 </svg>로 끝나야 해요.");
        }
        if (!VIEW_BOX.matcher(svg).find()) {
            throw ApiException.badRequest("이 SVG는 쓸 수 없어요: <svg>에 viewBox가 있어야 크기가 맞아요.");
        }
        for (Rule rule : RULES) {
            if (rule.pattern().matcher(svg).find()) {
                throw ApiException.badRequest("이 SVG는 쓸 수 없어요: " + rule.message());
            }
        }
        return svg.replaceAll("\\s*\\n\\s*", " ");
    }

    private record Rule(Pattern pattern, String message) {
    }
}
