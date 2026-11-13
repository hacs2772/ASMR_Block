package com.asmrblock.common;

/** 페이지 요청값. 이상한 값(음수, 너무 큰 size)은 안전한 범위로 맞춥니다. */
public record PageQuery(int page, int size) {

    public static final int MAX_SIZE = 100;

    public PageQuery {
        page = Math.max(page, 0);
        size = Math.min(Math.max(size, 1), MAX_SIZE);
    }

    public static PageQuery of(int page, int size) {
        return new PageQuery(page, size);
    }

    public int offset() {
        return page * size;
    }
}
