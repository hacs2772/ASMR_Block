package com.asmrblock.i18n;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 서버 안내·오류 문장 영어판. 코드에는 한국어 문장을 그대로 쓰고, 응답을 만들 때 영어 화면이면 이 표로 바꿈.
 * 표 = resources/i18n/messages_en.tsv ("한국어 문장 [탭] English"). {0} {1}이 있으면 그 자리에 무엇이 와도 맞는 틀.
 * 표에 없는 문장은 한국어 그대로 (빠뜨리지 않게 ServerMessagesTest가 코드의 한국어 문장을 모두 확인)
 */
public final class Messages {

    private static final String RESOURCE = "/i18n/messages_en.tsv";
    private static final Map<String, String> EXACT;
    private static final List<Template> TEMPLATES;

    record Template(String ko, String en, Pattern pattern) {
    }

    static {
        Map<String, String> exact = new LinkedHashMap<>();
        List<Template> templates = new ArrayList<>();
        for (String[] row : read()) {
            if (row[0].contains("{0}")) templates.add(new Template(row[0], row[1], compile(row[0])));
            else exact.put(row[0], row[1]);
        }
        EXACT = Collections.unmodifiableMap(exact);
        TEMPLATES = List.copyOf(templates);
    }

    private Messages() {
    }

    /** 지금 요청이 영어면 영어 문장, 아니면 그대로 */
    public static String tr(String message) {
        return Lang.english() ? toEnglish(message) : message;
    }

    /** 여러 문장을 ", "로 이은 것 (입력 검사 오류 여러 개)도 하나씩 바꿈 */
    public static String toEnglish(String message) {
        if (message == null || message.isEmpty()) return message;
        String exact = EXACT.get(message);
        if (exact != null) return exact;
        for (Template t : TEMPLATES) {
            Matcher m = t.pattern().matcher(message);
            if (m.matches()) {
                String en = t.en();
                // 들어간 값(예: SVG 검사 이유)도 표에 있으면 영어로
                for (int i = 1; i <= m.groupCount(); i++) en = en.replace("{" + (i - 1) + "}", toEnglish(m.group(i)));
                return en;
            }
        }
        if (message.contains(", ")) {
            String[] parts = message.split(", ");
            boolean all = true;
            StringBuilder out = new StringBuilder();
            for (String part : parts) {
                String en = toEnglish(part);
                if (en.equals(part)) all = false;
                if (!out.isEmpty()) out.append(", ");
                out.append(en);
            }
            if (all) return out.toString();
        }
        return message;
    }

    /** 표에 있는 한국어 문장·틀 (검사용) */
    static Map<String, String> exact() {
        return EXACT;
    }

    static List<Template> templates() {
        return TEMPLATES;
    }

    private static Pattern compile(String ko) {
        StringBuilder regex = new StringBuilder();
        Matcher m = Pattern.compile("\\{\\d}").matcher(ko);
        int last = 0;
        while (m.find()) {
            regex.append(Pattern.quote(ko.substring(last, m.start()))).append("(.+?)");
            last = m.end();
        }
        regex.append(Pattern.quote(ko.substring(last)));
        return Pattern.compile(regex.toString(), Pattern.DOTALL);
    }

    private static List<String[]> read() {
        try (InputStream in = Messages.class.getResourceAsStream(RESOURCE)) {
            if (in == null) throw new IllegalStateException(RESOURCE + " 없음");
            List<String[]> rows = new ArrayList<>();
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            String line;
            int no = 0;
            while ((line = reader.readLine()) != null) {
                no++;
                if (line.isBlank() || line.startsWith("#")) continue;
                String[] row = line.split("\t", -1);
                if (row.length != 2 || row[0].isBlank() || row[1].isBlank()) {
                    throw new IllegalStateException(RESOURCE + " " + no + "번째 줄 형식이 틀림: " + line);
                }
                rows.add(row);
            }
            return rows;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
