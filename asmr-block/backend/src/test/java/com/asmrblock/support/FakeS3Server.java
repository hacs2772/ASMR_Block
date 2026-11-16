package com.asmrblock.support;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;

/**
 * 테스트용 작은 S3 호환 서버 (Cloudflare R2·MinIO 대신, Docker 없이 JVM 안에서).
 * 경로 방식 주소(/버킷/키)로 PUT·GET·HEAD·DELETE·목록(ListObjectsV2)만. 서명은 확인하지 않음.
 * GET은 로그인 없이도 되니 "버킷 공개 주소"로도 씀 (앱·웹이 소리를 받는 곳)
 */
public final class FakeS3Server implements AutoCloseable {

    /** 저장된 파일: 내용 + 올릴 때 붙인 Content-Type·Cache-Control */
    public record StoredObject(byte[] data, String contentType, String cacheControl) {
    }

    private final HttpServer server;
    private final String bucket;
    private final Map<String, StoredObject> objects = new ConcurrentHashMap<>();

    public FakeS3Server(String bucket) throws IOException {
        this.bucket = bucket;
        this.server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        this.server.createContext("/", this::handle);
        this.server.setExecutor(Executors.newFixedThreadPool(8, r -> {
            Thread t = new Thread(r, "fake-s3");
            t.setDaemon(true);
            return t;
        }));
        this.server.start();
    }

    /** S3 주소 (endpoint) */
    public String endpoint() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    /** 버킷의 공개 주소 (public-base-url) */
    public String publicUrl() {
        return endpoint() + "/" + bucket;
    }

    public Map<String, StoredObject> objects() {
        return objects;
    }

    @Override
    public void close() {
        server.stop(0);
    }

    private void handle(HttpExchange ex) throws IOException {
        try (ex) {
            String path = ex.getRequestURI().getPath();
            String prefix = "/" + bucket;
            if (!path.startsWith(prefix)) {
                send(ex, 404, error("NoSuchBucket"), "application/xml");
                return;
            }
            String key = path.length() > prefix.length() + 1 ? path.substring(prefix.length() + 1) : "";
            String method = ex.getRequestMethod();
            if (key.isEmpty()) {
                if ("GET".equals(method)) {
                    send(ex, 200, list(), "application/xml");
                } else {
                    send(ex, 200, new byte[0], "application/xml");
                }
                return;
            }
            switch (method) {
                case "PUT" -> {
                    byte[] body = ex.getRequestBody().readAllBytes();
                    String sha = ex.getRequestHeaders().getFirst("x-amz-content-sha256");
                    if (sha != null && sha.startsWith("STREAMING")) {
                        body = decodeChunked(body);
                    }
                    objects.put(key, new StoredObject(body, ex.getRequestHeaders().getFirst("Content-Type"),
                            ex.getRequestHeaders().getFirst("Cache-Control")));
                    ex.getResponseHeaders().add("ETag", "\"" + Integer.toHexString(java.util.Arrays.hashCode(body)) + "\"");
                    send(ex, 200, new byte[0], null);
                }
                case "GET" -> {
                    StoredObject o = objects.get(key);
                    if (o == null) {
                        send(ex, 404, error("NoSuchKey"), "application/xml");
                    } else {
                        send(ex, 200, o.data(), o.contentType());
                    }
                }
                case "HEAD" -> {
                    StoredObject o = objects.get(key);
                    if (o == null) {
                        ex.sendResponseHeaders(404, -1);
                    } else {
                        if (o.contentType() != null) {
                            ex.getResponseHeaders().add("Content-Type", o.contentType());
                        }
                        ex.getResponseHeaders().add("Content-Length", String.valueOf(o.data().length));
                        ex.sendResponseHeaders(200, -1);
                    }
                }
                case "DELETE" -> {
                    objects.remove(key);
                    ex.sendResponseHeaders(204, -1);
                }
                default -> send(ex, 405, error("MethodNotAllowed"), "application/xml");
            }
        }
    }

    private byte[] list() {
        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")
                .append("<ListBucketResult xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\">")
                .append("<Name>").append(bucket).append("</Name><Prefix></Prefix>")
                .append("<KeyCount>").append(objects.size()).append("</KeyCount><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated>");
        new TreeMap<>(objects).forEach((k, o) -> xml.append("<Contents><Key>").append(escape(k))
                .append("</Key><LastModified>2026-01-01T00:00:00.000Z</LastModified><ETag>&quot;x&quot;</ETag><Size>")
                .append(o.data().length).append("</Size><StorageClass>STANDARD</StorageClass></Contents>"));
        return xml.append("</ListBucketResult>").toString().getBytes(StandardCharsets.UTF_8);
    }

    private static byte[] error(String code) {
        return ("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Error><Code>" + code + "</Code><Message>" + code + "</Message></Error>")
                .getBytes(StandardCharsets.UTF_8);
    }

    /** aws-chunked 본문 풀기: "크기;chunk-signature=..\r\n데이터\r\n" 반복, 크기 0이면 끝 */
    private static byte[] decodeChunked(byte[] body) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        InputStream in = new java.io.ByteArrayInputStream(body);
        while (true) {
            StringBuilder line = new StringBuilder();
            int c;
            while ((c = in.read()) != -1 && c != '\n') {
                if (c != '\r') {
                    line.append((char) c);
                }
            }
            if (line.isEmpty()) {
                return out.toByteArray();
            }
            int size = Integer.parseInt(line.toString().split(";")[0].trim(), 16);
            if (size == 0) {
                return out.toByteArray();
            }
            out.write(in.readNBytes(size));
            in.read();
            in.read(); // \r\n
        }
    }

    private static void send(HttpExchange ex, int status, byte[] body, String contentType) throws IOException {
        if (contentType != null) {
            ex.getResponseHeaders().add("Content-Type", contentType);
        }
        ex.sendResponseHeaders(status, body.length == 0 ? -1 : body.length);
        if (body.length > 0) {
            try (OutputStream os = ex.getResponseBody()) {
                os.write(body);
            }
        }
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
