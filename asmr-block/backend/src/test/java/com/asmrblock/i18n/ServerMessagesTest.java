package com.asmrblock.i18n;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 서버 안내·오류 문장 영어판 검사 (스프링 없이 빠르게).
 * 코드에 있는 한국어 글자(주석·로그·개발자용 오류 빼고)가 모두 messages_en.tsv에 있는지 — 새 문장을 쓰고 영어를 빠뜨리면 여기서 실패.
 * 따로 영어판이 있는 곳(공유 미리보기 ShareService, 알림 문장 NotificationService)과 그 줄에 // i18n-ok 가 있으면 뺌
 */
class ServerMessagesTest {

    private static final Pattern HANGUL = Pattern.compile("[가-힣]");
    private static final Path SRC = Path.of("src/main/java");
    /** 자기 영어판을 따로 가진 파일 */
    private static final Set<String> OWN_ENGLISH = Set.of("ShareService.java", "NotificationService.java");
    /** 화면에 안 나가는 줄 (개발자용 오류 — 사용자는 "서버 오류가 발생했습니다."만 봄 · 로그) */
    private static final Pattern INTERNAL = Pattern.compile(
            "new (IllegalStateException|IllegalArgumentException|UncheckedIOException|AudioProcessingException)\\(|\\blog\\.(info|warn|error|debug|trace)\\(");

    record Literal(String file, int line, String text, String lineText) {
    }

    @Test
    @DisplayName("코드의 한국어 문장은 모두 영어판이 있음 (틀 {0}·%d 포함, 이어 붙인 조각도)")
    void everyKoreanMessageHasEnglish() throws IOException {
        List<String> missing = new ArrayList<>();
        for (Literal lit : koreanLiterals()) {
            String l = lit.lineText().trim();
            boolean joined = l.contains("\" +") || l.contains("+ \"") || l.startsWith("+") || l.endsWith("+");
            if (!covered(lit.text(), joined)) missing.add(lit.file() + ":" + lit.line() + "  \"" + lit.text() + "\"");
        }
        assertThat(missing).as("messages_en.tsv에 영어를 넣거나, 화면에 안 나가는 글이면 그 줄에 // i18n-ok").isEmpty();
    }

    @Test
    @DisplayName("영어 쪽에는 한국어가 없고, 틀의 {0} 자리가 두 언어에서 같음")
    void englishIsClean() {
        Messages.exact().forEach((ko, en) -> assertThat(HANGUL.matcher(en).find()).as(ko).isFalse());
        for (Messages.Template t : Messages.templates()) {
            assertThat(HANGUL.matcher(t.en()).find()).as(t.ko()).isFalse();
            assertThat(placeholders(t.en())).as(t.ko()).isEqualTo(placeholders(t.ko()));
        }
    }

    @Test
    @DisplayName("영어로 바꾸기: 정확히 같은 문장 · 틀(숫자) · 틀 안의 값 · 쉼표로 이은 여러 문장 · 표에 없으면 그대로")
    void translate() {
        assertThat(Messages.toEnglish("이미 사용 중인 이메일입니다.")).isEqualTo("This email is already in use.");
        assertThat(Messages.toEnglish("블록은 하루에 20개까지 올릴 수 있어요. 내일 다시 올려 주세요."))
                .isEqualTo("You can upload up to 20 blocks a day. Please upload again tomorrow.");
        assertThat(Messages.toEnglish("블록 길이는 10초 ~ 20분 사이여야 합니다. 긴 녹음은 구간을 골라 올려 주세요."))
                .isEqualTo("A block must be between 10 seconds and 20 minutes long. For a long recording, choose the part to upload.");
        assertThat(Messages.toEnglish("이 SVG는 쓸 수 없어요: script는 넣을 수 없어요."))
                .isEqualTo("This SVG can't be used: script isn't allowed.");
        assertThat(Messages.toEnglish("영상 파일은 90MB까지 올릴 수 있어요.")).isEqualTo("Videos can be up to 90MB.");
        assertThat(Messages.toEnglish("이메일은 필수입니다., 비밀번호는 필수입니다."))
                .isEqualTo("Email is required., Password is required.");
        assertThat(Messages.toEnglish("신고로 내려졌어요: 남의 노래가 들어 있어요")).isEqualTo("Taken down after a report: 남의 노래가 들어 있어요");
        assertThat(Messages.toEnglish("표에 없는 문장")).isEqualTo("표에 없는 문장");
        // 요청 언어가 한국어면 그대로
        assertThat(Lang.with(Lang.KO, () -> Messages.tr("이미 사용 중인 이메일입니다."))).isEqualTo("이미 사용 중인 이메일입니다.");
        assertThat(Lang.with(Lang.EN, () -> Messages.tr("이미 사용 중인 이메일입니다."))).isEqualTo("This email is already in use.");
    }

    @Test
    @DisplayName("요청 언어: Accept-Language 맨 앞이 영어면 en, 그 밖은 ko · 주소의 lang=")
    void language() {
        assertThat(Lang.fromHeader("en")).isEqualTo("en");
        assertThat(Lang.fromHeader("en-US,en;q=0.9,ko;q=0.8")).isEqualTo("en");
        assertThat(Lang.fromHeader("ko-KR,ko;q=0.9,en;q=0.8")).isEqualTo("ko");
        assertThat(Lang.fromHeader("ja")).isEqualTo("ko");
        assertThat(Lang.fromHeader(null)).isEqualTo("ko");
        assertThat(LangFilter.queryLang("a=1&lang=en")).isEqualTo("en");
        assertThat(LangFilter.queryLang("lang=english")).isNull();
        assertThat(Lang.current()).isEqualTo("ko");
    }

    /**
     * 이 한국어 글자가 표에 있나: 정확히 같은 문장이거나, %d·%s를 {n}으로 본 틀과 같음.
     * "…" + 값 + "…"처럼 이어 붙인 줄(joined)의 조각만 틀·문장 안에 들어 있으면 됨 (마침표 하나 다른 문장이 그냥 통과하지 않게)
     */
    private static boolean covered(String text, boolean joined) {
        if (Messages.exact().containsKey(text)) return true;
        String normalized = text.replaceAll("%[ds]", "{*}");
        for (Messages.Template t : Messages.templates()) {
            if (t.ko().replaceAll("\\{\\d}", "{*}").equals(normalized)) return true;
        }
        if (!joined || text.isBlank()) return false;
        for (Messages.Template t : Messages.templates()) {
            for (String piece : t.ko().split("\\{\\d}")) {
                if (piece.contains(text)) return true;
            }
        }
        return Messages.exact().keySet().stream().anyMatch(ko -> ko.contains(text));
    }

    private static List<String> placeholders(String s) {
        return Pattern.compile("\\{\\d}").matcher(s).results().map(r -> r.group()).sorted().toList();
    }

    /** src/main/java의 한국어 글자 (주석 빼고, 한 글자씩 읽어서 문자열·주석을 가림) */
    static List<Literal> koreanLiterals() throws IOException {
        List<Literal> out = new ArrayList<>();
        try (Stream<Path> files = Files.walk(SRC)) {
            for (Path file : files.filter(p -> p.toString().endsWith(".java")).sorted().toList()) {
                String name = file.getFileName().toString();
                if (OWN_ENGLISH.contains(name)) continue;
                String src = Files.readString(file, StandardCharsets.UTF_8);
                String[] lines = src.split("\n", -1);
                for (int[] range : stringRanges(src)) {
                    String text = src.substring(range[0], range[1]);
                    if (!HANGUL.matcher(text).find()) continue;
                    int line = (int) src.substring(0, range[0]).chars().filter(c -> c == '\n').count();
                    String lineText = lines[line];
                    if (lineText.contains("i18n-ok") || INTERNAL.matcher(lineText).find()) continue;
                    out.add(new Literal(SRC.relativize(file).toString(), line + 1, unescape(text), lineText));
                }
            }
        }
        return out;
    }

    /** 문자열 안쪽 [시작, 끝) — // · /* 주석, 글자('a'), 텍스트 블록(""") 처리 */
    private static List<int[]> stringRanges(String s) {
        List<int[]> ranges = new ArrayList<>();
        int i = 0;
        int n = s.length();
        while (i < n) {
            char c = s.charAt(i);
            if (c == '/' && i + 1 < n && s.charAt(i + 1) == '/') {
                while (i < n && s.charAt(i) != '\n') i++;
            } else if (c == '/' && i + 1 < n && s.charAt(i + 1) == '*') {
                int end = s.indexOf("*/", i + 2);
                i = end < 0 ? n : end + 2;
            } else if (c == '"' && s.startsWith("\"\"\"", i)) {
                int end = s.indexOf("\"\"\"", i + 3);
                ranges.add(new int[]{i + 3, end});
                i = end + 3;
            } else if (c == '"') {
                int start = ++i;
                while (i < n && s.charAt(i) != '"') i += s.charAt(i) == '\\' ? 2 : 1;
                ranges.add(new int[]{start, i});
                i++;
            } else if (c == '\'') {
                i++;
                while (i < n && s.charAt(i) != '\'') i += s.charAt(i) == '\\' ? 2 : 1;
                i++;
            } else {
                i++;
            }
        }
        return ranges;
    }

    private static String unescape(String s) {
        return s.replace("\\\"", "\"").replace("\\n", "\n").replace("\\\\", "\\");
    }
}
