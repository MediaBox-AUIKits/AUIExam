package com.aliyuncs.aui.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 需要老师手动播放的音频
 *
 * @author chunlei.zcl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamAudioInfoDto {

    private String id;

    /**
     *  分类
     */
    private Integer classify;
    /**

    /**
     *  昵称
     */
    private String name;

    /**
     *  地址
     */
    private String url;

}
