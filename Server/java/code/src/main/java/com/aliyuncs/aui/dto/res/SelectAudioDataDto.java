package com.aliyuncs.aui.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 需要老师手动播放的音频列表
 *
 * @author chunlei.zcl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SelectAudioDataDto {

    @Builder.Default
    private Integer  pageNum = 1;
    @Builder.Default
    private Integer pageSize = 10;

    private Integer total;

    private List<ExamAudioInfoDto> list;
}
