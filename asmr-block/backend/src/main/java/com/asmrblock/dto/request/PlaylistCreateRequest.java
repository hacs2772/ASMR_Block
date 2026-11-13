package com.asmrblock.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class PlaylistCreateRequest {
    
    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = 100, message = "제목은 100자 이내여야 합니다.")
    private String title;
    
    private String description;
    
    private Boolean isPublic = false;
    
    @NotEmpty(message = "블록은 최소 1개 이상이어야 합니다.")
    @Size(max = 100, message = "블록은 최대 100개까지 넣을 수 있습니다.")
    private List<@Valid @NotNull(message = "블록 정보가 비어 있습니다.") BlockItem> blocks;
    
    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BlockItem {
        @NotNull(message = "blockId는 필수입니다.")
        private Long blockId;

        // 참고용 값. 실제 재생 순서는 blocks 배열 순서대로 저장됩니다.
        private Integer sortOrder;
    }
}
