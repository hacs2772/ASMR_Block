package com.asmrblock.sticker;

import com.asmrblock.common.ApiResponse;
import com.asmrblock.sticker.StickerDtos.StickerResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 스티커 그림 목록 (로그인 없이). 앱·웹이 블록 겉면을 그릴 때 씀 */
@RestController
@RequestMapping("/api/v1/stickers")
@RequiredArgsConstructor
public class StickerController {

    private final StickerService stickerService;

    @GetMapping
    public ApiResponse<List<StickerResponse>> list() {
        return ApiResponse.ok(stickerService.list());
    }
}
