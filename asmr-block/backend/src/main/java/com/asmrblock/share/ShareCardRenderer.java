package com.asmrblock.share;

import com.asmrblock.playlist.LayerRole;
import com.asmrblock.playlist.Playlist;
import com.asmrblock.playlist.PlaylistBlock;
import com.asmrblock.playlist.PlaylistLayer;

import javax.imageio.ImageIO;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

/**
 * 공유 링크 미리보기 그림 (1200×630 PNG): 밤 바탕 + 레고 바닥판 위에 그 조합의 블록 두 줄 (색 = 트리거, 길이 = 소리 길이).
 * 앱·웹 블록(C안)과 같은 모양: 진한 테두리 · 위 밝은 띠 · 아래 두께 · 오른쪽 돌기 두 개. 글자는 쓰지 않음 (제목은 카드 아래 글로 나옴)
 */
final class ShareCardRenderer {

    static final int W = 1200;
    static final int H = 630;
    private static final Color NIGHT = new Color(0x0A0A0F);
    private static final Color PLATE = new Color(0x0E0E14);
    private static final Color LINE = new Color(0x22222C);
    private static final Color STUD = new Color(0x1A1A23);
    private static final Color PINK = new Color(0xF7609A);
    private static final Color FALLBACK = new Color(0x9AA0AE);
    /** 한 줄에 그리는 블록 수 상한 (반복이 많으면 한 덩어리로) */
    private static final int MAX_BRICKS = 160;

    private ShareCardRenderer() {
    }

    static byte[] render(Playlist playlist) {
        BufferedImage image = new BufferedImage(W, H, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setColor(NIGHT);
            g.fillRect(0, 0, W, H);

            // 로고: 블록 셋 (탭핑 · 바스락 · 귓속말)
            int lx = 80;
            for (Color c : List.of(new Color(0xFF8A3D), new Color(0x8CCB4E), new Color(0xFF6FA3))) {
                brick(g, c, lx, 64, 64, 40);
                lx += 72;
            }

            // 바닥판 + 돌기 무늬
            int px = 64;
            int py = 150;
            int pw = W - 128;
            int ph = 400;
            g.setColor(PLATE);
            g.fill(new RoundRectangle2D.Double(px, py, pw, ph, 28, 28));
            g.setColor(STUD);
            for (int y = py + 22; y < py + ph - 10; y += 34) {
                for (int x = px + 22; x < px + pw - 10; x += 34) {
                    g.fillOval(x - 5, y - 5, 10, 10);
                }
            }
            g.setColor(LINE);
            g.setStroke(new BasicStroke(2f));
            g.draw(new RoundRectangle2D.Double(px, py, pw, ph, 28, 28));

            PlaylistLayer main = playlist.layer(LayerRole.MAIN).orElse(null);
            PlaylistLayer mix = playlist.layer(LayerRole.MIX).filter(l -> !l.getBlocks().isEmpty()).orElse(null);
            int innerX = px + 40;
            int innerW = pw - 80 - 14; // 오른쪽 돌기 자리
            int cycle = Math.max(1, Math.max(main == null ? 0 : main.duration(), mix == null ? 0 : mix.duration()));
            double scale = innerW / (double) cycle;
            if (mix == null) {
                drawRow(g, main, innerX, py + 140, 120, scale, false);
            } else {
                drawRow(g, main, innerX, py + 80, 110, scale, false);
                drawRow(g, mix, innerX, py + 240, 84, scale, true);
            }

            // 아래 분홍 줄 (재생선 느낌)
            g.setColor(PINK);
            g.fill(new RoundRectangle2D.Double(px, py + ph + 30, 220, 8, 8, 8));
        } finally {
            g.dispose();
        }
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** 한 줄: 첫째 줄은 빈틈없이 이어서, 둘째 줄(레이어드)은 시작 시각 자리에 */
    private static void drawRow(Graphics2D g, PlaylistLayer layer, int x0, int y, int h, double scale, boolean byStart) {
        if (layer == null) {
            return;
        }
        double x = x0;
        int drawn = 0;
        for (PlaylistBlock pb : layer.getBlocks()) {
            int seconds = pb.getBlock() == null || pb.getBlock().getDuration() == null ? 0 : pb.getBlock().getDuration();
            int repeat = Math.max(1, pb.getRepeatCount() == null ? 1 : pb.getRepeatCount());
            Color color = colorOf(pb);
            if (byStart) {
                x = x0 + (pb.getStartSeconds() == null ? 0 : pb.getStartSeconds()) * scale;
            }
            double one = seconds * scale;
            // 블록이 너무 작거나 많으면 반복을 한 덩어리로
            boolean merge = one < 10 || drawn + repeat > MAX_BRICKS;
            int pieces = merge ? 1 : repeat;
            double width = merge ? one * repeat : one;
            for (int i = 0; i < pieces; i++) {
                brick(g, color, (int) Math.round(x), y, Math.max(6, (int) Math.round(width) - 3), h);
                x += width;
                drawn++;
            }
        }
    }

    private static Color colorOf(PlaylistBlock pb) {
        try {
            String hex = pb.getBlock().getCategory().getColor();
            return hex == null ? FALLBACK : Color.decode(hex);
        } catch (RuntimeException e) {
            return FALLBACK;
        }
    }

    /** 블록 하나 (C안): 아래 두께 그림자 → 몸통 → 위 밝은 띠 → 아래 어두운 띠 → 진한 테두리 → 오른쪽 돌기 */
    static void brick(Graphics2D g, Color color, int x, int y, int w, int h) {
        Color base = shade(color, -0.12);
        Color edge = shade(base, -0.42);
        int r = Math.max(4, Math.min(10, h / 8));
        int studW = Math.max(5, Math.min(14, h / 8));
        int edgeW = Math.max(2, h / 28);

        g.setColor(new Color(0, 0, 0, 110));
        g.fill(new RoundRectangle2D.Double(x + 2, y + 6, w, h, r, r));
        // 오른쪽 돌기 두 개 (몸통 뒤)
        for (double at : new double[]{0.17, 0.57}) {
            int sy = (int) (y + h * at);
            int sh = Math.max(4, (int) (h * 0.26));
            g.setColor(base);
            g.fillRect(x + w - 2, sy, studW + 2, sh);
            g.setColor(edge);
            g.setStroke(new BasicStroke(edgeW));
            g.drawRect(x + w - 2, sy, studW + 2, sh);
        }
        g.setColor(base);
        g.fill(new RoundRectangle2D.Double(x, y, w, h, r, r));
        g.setColor(shade(base, 0.32));
        g.fill(new RoundRectangle2D.Double(x, y, w, Math.max(4, h * 0.12), r, r));
        g.setColor(shade(base, -0.24));
        g.fillRect(x + edgeW, (int) (y + h - Math.max(6, h * 0.16)), Math.max(1, w - edgeW * 2), (int) Math.max(6, h * 0.16) - edgeW);
        g.setColor(edge);
        g.setStroke(new BasicStroke(edgeW));
        g.draw(new RoundRectangle2D.Double(x + edgeW / 2.0, y + edgeW / 2.0, w - edgeW, h - edgeW, r, r));
    }

    /** 색을 밝게(+)·어둡게(-) (웹 lib/blocks.js shade와 같은 방식) */
    static Color shade(Color c, double amount) {
        int target = amount < 0 ? 0 : 255;
        double p = Math.abs(amount);
        return new Color(mix(c.getRed(), target, p), mix(c.getGreen(), target, p), mix(c.getBlue(), target, p));
    }

    private static int mix(int from, int to, double p) {
        return (int) Math.round(from + (to - from) * p);
    }
}
