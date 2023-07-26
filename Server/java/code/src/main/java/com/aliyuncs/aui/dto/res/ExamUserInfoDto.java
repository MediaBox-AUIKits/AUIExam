package com.aliyuncs.aui.dto.res;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 考试信息DTO
 *
 * @author chunlei.zcl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamUserInfoDto {

    /**
     * 用户id
     */
    private String id;

    /**
     *  昵称
     */
    private String name;
    /**
     *  状态
     */
    private Integer userStatus;
    /**
     *  推流地址
     */
    private String rtcPushUrl;

    /**
     *  大流地址
     */
    private String rtcPullUrl;
    /**
     *  小流地址（转码低清晰度的流）
     */
    private String rtsPullUrl;

}
