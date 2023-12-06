package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 获取作弊检测信息
 * @author chunlei.zcl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ApiModel(value = "获取作弊检测信息")
public class CheatRecordListRequestDto {

    @ApiModelProperty(value = "考试Id")
    private String examId;

    @ApiModelProperty(value = "考场Id")
    private String roomId;

    private Integer pageSize = 20;

    private String scrollToken;

}
