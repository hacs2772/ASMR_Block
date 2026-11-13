package com.asmrblock.common;

import java.util.List;
import java.util.function.Function;

public record PageResponse<T>(List<T> content, PageInfo pageInfo) {

    public record PageInfo(int page, int size, long totalElements, int totalPages, boolean hasNext) {
    }

    public static <T> PageResponse<T> of(List<T> content, PageQuery query, long totalElements) {
        int totalPages = (int) Math.ceil((double) totalElements / query.size());
        return new PageResponse<>(content, new PageInfo(
                query.page(), query.size(), totalElements, totalPages, query.page() < totalPages - 1));
    }

    public <R> PageResponse<R> map(Function<T, R> mapper) {
        return new PageResponse<>(content.stream().map(mapper).toList(), pageInfo);
    }
}
