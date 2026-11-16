package com.asmrblock.block;

import com.asmrblock.block.BlockDtos.SampleStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * 공개용 샘플(로그인 불가 계정 "ASMR Block 샘플")을 한꺼번에 상점·추천 조합에서 숨기기/다시 보이기.
 * 블록은 is_listed만 바꿔서(승인·활성은 그대로) 이미 담은 사람의 블록함·조합에서는 그대로 들을 수 있음.
 * 샘플 SQL은 없는 것만 넣으니 서버를 다시 켜도 숨긴 그대로
 */
@Service
@RequiredArgsConstructor
public class SampleService {

    private final SampleMapper sampleMapper;

    @Transactional(readOnly = true)
    public SampleStatusResponse status() {
        Map<String, Object> row = sampleMapper.status();
        long listed = n(row, "listed_sample_blocks");
        long publicCombos = n(row, "public_sample_combos");
        return new SampleStatusResponse(n(row, "sample_blocks"), listed, n(row, "sample_combos"), publicCombos,
                n(row, "real_blocks"), listed > 0 || publicCombos > 0);
    }

    @Transactional
    public SampleStatusResponse setVisible(boolean visible) {
        sampleMapper.setBlocksListed(visible);
        sampleMapper.setCombosPublic(visible);
        return status();
    }

    private static long n(Map<String, Object> row, String key) {
        return row.get(key) instanceof Number num ? num.longValue() : 0L;
    }
}
