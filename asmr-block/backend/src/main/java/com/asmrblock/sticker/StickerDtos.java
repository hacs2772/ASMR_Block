package com.asmrblock.sticker;

import com.asmrblock.storage.StorageService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public final class StickerDtos {

    private StickerDtos() {
    }

    /**
     * 스티커 그림. svg(SVG 글자)나 imageUrl(PNG) 중 하나가 있음.
     * active=false면 숨긴 스티커: 새로 고를 수는 없지만 이미 붙인 블록에서는 그대로 그림
     */
    public record StickerResponse(String code, String name, String svg, String imageUrl, boolean active) {
        public static StickerResponse from(Sticker sticker, StorageService storage) {
            return new StickerResponse(sticker.getCode(), sticker.getName(), sticker.getSvg(),
                    storage.publicUrl(sticker.getImageKey()), Boolean.TRUE.equals(sticker.getIsActive()));
        }
    }

    /** 관리자: 스티커 추가 (multipart). file = SVG 또는 PNG·JPG·WEBP */
    public record StickerCreateRequest(
            @NotBlank(message = "스티커 이름을 적어 주세요.")
            @Size(max = 10, message = "스티커 이름은 10자 이내로 적어 주세요.")
            String name,
            MultipartFile file) {
    }

    /** 관리자: 이름 바꾸기 / 숨기기·다시 보이기 (보낸 것만 바뀜) */
    public record StickerUpdateRequest(
            @Size(min = 1, max = 10, message = "스티커 이름은 1~10자로 적어 주세요.")
            String name,
            Boolean active) {
    }

    /** 관리자: 순서 (앞에서부터) */
    public record StickerOrderRequest(
            @NotEmpty(message = "순서를 정할 스티커를 보내 주세요.")
            List<String> codes) {
    }
}
