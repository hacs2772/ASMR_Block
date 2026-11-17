package com.asmrblock.tonight;

import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI 없이 한 줄에서 트리거 찾기 (AI가 꺼져 있거나 대답을 못 할 때). 낱말 표 = resources/tonight/words.tsv.
 * "비 오는 날 카페에서 책 읽는 느낌" → rain·place·crinkle 한 번씩
 */
@Component
public class WordPlanner {

    private static final String RESOURCE = "/tonight/words.tsv";

    record Word(String code, String text, Pattern pattern) {
    }

    private final List<Word> words;

    public WordPlanner() {
        this.words = load();
    }

    /** 묶음 코드 → 찾은 횟수 (찾은 순서대로). 하나도 없으면 빈 맵 */
    public Map<String, Integer> match(String sentence) {
        Map<String, Integer> hits = new LinkedHashMap<>();
        if (sentence == null || sentence.isBlank()) return hits;
        String text = sentence.toLowerCase(Locale.ROOT);
        for (Word w : words) {
            Matcher m = w.pattern().matcher(text);
            int n = 0;
            StringBuilder rest = new StringBuilder();
            while (m.find()) {
                n++;
                m.appendReplacement(rest, " ".repeat(m.group().length()));
            }
            if (n > 0) {
                m.appendTail(rest);
                text = rest.toString();
                hits.merge(w.code(), n, Integer::sum);
            }
        }
        return hits;
    }

    private static List<Word> load() {
        List<Word> out = new ArrayList<>();
        try (InputStream in = WordPlanner.class.getResourceAsStream(RESOURCE)) {
            if (in == null) throw new IllegalStateException("낱말 표가 없습니다: " + RESOURCE);
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank() || line.startsWith("#")) continue;
                String[] parts = line.split("\t", 2);
                if (parts.length < 2) continue;
                for (String raw : parts[1].split(",")) {
                    String word = raw.trim().toLowerCase(Locale.ROOT);
                    if (word.isEmpty()) continue;
                    boolean latin = word.chars().allMatch(c -> c < 0x0250);
                    // 영어는 낱말 앞이 영어 글자가 아닐 때만 ("train" ≠ rain)
                    Pattern p = Pattern.compile((latin ? "(?<![a-z])" : "") + Pattern.quote(word));
                    out.add(new Word(parts[0].trim(), word, p));
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        out.sort(Comparator.comparingInt((Word w) -> w.text().length()).reversed());
        return List.copyOf(out);
    }
}
