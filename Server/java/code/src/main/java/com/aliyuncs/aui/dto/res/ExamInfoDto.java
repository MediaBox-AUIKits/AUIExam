package com.aliyuncs.aui.dto.res;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * 考试信息DTO
 *
 * @author chunlei.zcl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamInfoDto {

    private String id;
    /**
     * 创建时间
     */
    private Date createdAt;
    /**
     * 修改时间
     */
    private Date updatedAt;
    /**
     * 考试名称
     */
    private String name;
    /**
     * 开始时间
     */
    private Date startTime;
    /**
     * 结束时间
     */
    private Date endTime;

    /**
    * 需要老师手动播放的音频
    */
    @JsonProperty("audioInfo")
    private List<ExamAudioInfoDto> audioInfos = new ArrayList<>();

    /**
     * 自动播放的音频 radioInfo
     */
    @JsonProperty("radioInfo")
    private List<ExamAudioInfoDto> radioInfos = new ArrayList<>();

}
