package com.asmrblock.controller;

/** page/size 값이 이상하게 들어와도(음수, 너무 큰 값) 안전한 범위로 맞춥니다. */
final class Paging {

    static final int MAX_SIZE = 100;

    private Paging() {
    }

    static int page(int page) {
        return Math.max(page, 0);
    }

    static int size(int size) {
        return Math.min(Math.max(size, 1), MAX_SIZE);
    }
}
