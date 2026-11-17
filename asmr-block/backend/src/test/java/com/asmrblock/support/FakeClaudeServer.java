package com.asmrblock.support;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;

/**
 * 테스트용 가짜 Claude API (진짜 API·요금 없이, JVM 안에서). POST /v1/messages만.
 * 대답은 사용자 문장으로 정함: REFUSE → 거절(stop_reason refusal), BOOM → 500 오류, NONSENSE → 모르는 트리거 코드,
 * 그 밖 → 바스락 3 + 탭핑 1, 둘째 줄 빗소리 2, 이름 "비 오는 카페의 오후". 받은 요청(본문·키 = Authorization: Bearer 또는 x-api-key)은 requests()에
 */
public final class FakeClaudeServer implements AutoCloseable {

    public record Received(String body, String apiKey) {
    }

    public static final String GOOD_ANSWER =
            "{\"title\":\"비 오는 카페의 오후\",\"main\":[{\"code\":\"crinkle\",\"weight\":3},{\"code\":\"tap\",\"weight\":1}],"
                    + "\"layer\":[{\"code\":\"rain\",\"weight\":2}]}";
    public static final String NONSENSE_ANSWER =
            "{\"title\":\"?\",\"main\":[{\"code\":\"laser\",\"weight\":3}],\"layer\":[{\"code\":\"tap\",\"weight\":1}]}";

    private final HttpServer server;
    private final List<Received> requests = new CopyOnWriteArrayList<>();

    public FakeClaudeServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.setExecutor(Executors.newFixedThreadPool(4, r -> {
            Thread t = new Thread(r, "fake-claude");
            t.setDaemon(true);
            return t;
        }));
        server.start();
    }

    public String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    public List<Received> requests() {
        return requests;
    }

    /** 이 낱말이 들어간 요청 수 */
    public long count(String word) {
        return requests.stream().filter(r -> r.body().contains(word)).count();
    }

    @Override
    public void close() {
        server.stop(0);
    }

    private void handle(HttpExchange ex) throws IOException {
        try (ex) {
            String body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            if (!"POST".equals(ex.getRequestMethod()) || !ex.getRequestURI().getPath().equals("/v1/messages")) {
                send(ex, 404, "{\"type\":\"error\",\"error\":{\"type\":\"not_found_error\",\"message\":\"no\"}}");
                return;
            }
            String key = ex.getRequestHeaders().getFirst("x-api-key");
            String auth = ex.getRequestHeaders().getFirst("Authorization");
            if (key == null && auth != null && auth.startsWith("Bearer ")) key = auth.substring("Bearer ".length());
            requests.add(new Received(body, key));
            if (body.contains("BOOM")) {
                send(ex, 500, "{\"type\":\"error\",\"error\":{\"type\":\"api_error\",\"message\":\"boom\"}}");
            } else if (body.contains("REFUSE")) {
                send(ex, 200, message("[]", "refusal",
                        ",\"stop_details\":{\"type\":\"refusal\",\"category\":null,\"explanation\":null}"));
            } else {
                String answer = body.contains("NONSENSE") ? NONSENSE_ANSWER : GOOD_ANSWER;
                send(ex, 200, message("[{\"type\":\"text\",\"text\":" + quote(answer) + "}]", "end_turn", ""));
            }
        }
    }

    private static String message(String content, String stopReason, String extra) {
        return "{\"id\":\"msg_test\",\"type\":\"message\",\"role\":\"assistant\",\"model\":\"claude-haiku-5-5\","
                + "\"content\":" + content + ",\"stop_reason\":\"" + stopReason + "\",\"stop_sequence\":null" + extra
                + ",\"usage\":{\"input_tokens\":600,\"output_tokens\":80}}";
    }

    private static String quote(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private static void send(HttpExchange ex, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }
}
