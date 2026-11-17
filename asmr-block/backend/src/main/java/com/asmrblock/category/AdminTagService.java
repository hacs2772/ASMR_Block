package com.asmrblock.category;

import com.asmrblock.category.CategoryDtos.AdminTagResponse;
import com.asmrblock.category.CategoryDtos.TagCreateRequest;
import com.asmrblock.category.CategoryDtos.TagUpdateRequest;
import com.asmrblock.common.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 관리자: 소리 느낌 태그(부드러운·바삭한·느린…) 추가·고치기·숨기기·순서.
 * 앱·웹은 GET /tags로 받아 그리므로 앱 업데이트 없이 바로 바뀜. 이미 달린 블록이 있어서 지우지 않고 숨김
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminTagService {

    private final CategoryMapper categoryMapper;

    public List<AdminTagResponse> list() {
        return categoryMapper.findAllTagsForAdmin().stream().map(AdminTagResponse::of).toList();
    }

    @Transactional
    public List<AdminTagResponse> create(TagCreateRequest request) {
        SoundTag tag = SoundTag.builder()
                .name(request.name().trim())
                .nameEn(blank(request.nameEn()) ? null : request.nameEn().trim())
                .sortOrder(categoryMapper.nextTagSortOrder())
                .build();
        categoryMapper.insertTag(tag);
        categoryMapper.updateTagCode(tag.getId(), "t" + tag.getId());
        return list();
    }

    @Transactional
    public List<AdminTagResponse> update(Long id, TagUpdateRequest request) {
        find(id);
        String name = request.name() == null ? null : request.name().trim();
        if (name != null && name.isEmpty()) {
            throw ApiException.badRequest("이름을 적어 주세요.");
        }
        categoryMapper.updateTag(id, name, request.nameEn() == null ? null : request.nameEn().trim(), request.active());
        return list();
    }

    @Transactional
    public List<AdminTagResponse> reorder(List<Long> ids) {
        List<Long> unique = ids.stream().distinct().toList();
        unique.forEach(this::find);
        for (int i = 0; i < unique.size(); i++) {
            categoryMapper.updateTagSortOrder(unique.get(i), i + 1);
        }
        return list();
    }

    private SoundTag find(Long id) {
        SoundTag tag = id == null ? null : categoryMapper.findTagById(id);
        if (tag == null) {
            throw ApiException.notFound("태그를 찾을 수 없어요.");
        }
        return tag;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
