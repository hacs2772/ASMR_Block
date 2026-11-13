package com.asmrblock.category;

import com.asmrblock.category.CategoryDtos.CategoryResponse;
import com.asmrblock.category.CategoryDtos.CategoryTreeResponse;
import com.asmrblock.category.CategoryDtos.TagResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryMapper categoryMapper;

    /** 대분류 > 소분류 메뉴 트리 */
    public List<CategoryTreeResponse> getCategoryTree() {
        List<SoundCategory> all = categoryMapper.findAllCategories();
        Map<Long, List<CategoryResponse>> children = all.stream()
                .filter(c -> c.getParentId() != null)
                .collect(Collectors.groupingBy(SoundCategory::getParentId,
                        Collectors.mapping(CategoryResponse::from, Collectors.toList())));
        return all.stream()
                .filter(c -> c.getParentId() == null)
                .map(c -> new CategoryTreeResponse(c.getId(), c.getName(), c.getColor(), c.getIcon(),
                        c.getDescription(), children.getOrDefault(c.getId(), List.of())))
                .toList();
    }

    public List<SoundTag> getTags() {
        return categoryMapper.findAllTags();
    }

    public boolean existsCategory(Long id) {
        return id != null && categoryMapper.existsCategory(id);
    }

    /** 블록은 소분류에만 달 수 있음 (메뉴 트리에서 찾을 수 있도록) */
    public boolean isLeafCategory(Long id) {
        return id != null && categoryMapper.isLeafCategory(id);
    }

    public boolean allTagsExist(Collection<Long> tagIds) {
        var unique = new HashSet<>(tagIds);
        return unique.isEmpty() || categoryMapper.countActiveTags(unique) == unique.size();
    }

    /** blockId → 태그 목록 (블록 목록 화면에서 블록마다 따로 조회하지 않도록) */
    public Map<Long, List<TagResponse>> tagsByBlockIds(Collection<Long> blockIds) {
        if (blockIds.isEmpty()) {
            return Map.of();
        }
        return categoryMapper.findTagsByBlockIds(blockIds).stream()
                .collect(Collectors.groupingBy(BlockTag::getBlockId,
                        Collectors.mapping(t -> new TagResponse(t.getId(), t.getName()), Collectors.toList())));
    }
}
