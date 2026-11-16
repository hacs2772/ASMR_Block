package com.asmrblock.creator;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.creator.CreatorDtos.CreatorResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 크리에이터 페이지 머리 (로그인 없이). 블록 목록은 GET /blocks?uploaderId={id} */
@RestController
@RequestMapping("/api/v1/creators")
@RequiredArgsConstructor
public class CreatorController {

    private final CreatorService creatorService;

    @GetMapping("/{userId}")
    public ApiResponse<CreatorResponse> get(@PathVariable Long userId) {
        return ApiResponse.ok(creatorService.get(userId));
    }
}
