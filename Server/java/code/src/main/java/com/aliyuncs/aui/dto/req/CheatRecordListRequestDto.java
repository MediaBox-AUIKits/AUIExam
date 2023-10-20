package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;

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

    @ApiModelProperty(value = "考场Id")
    @NotBlank(message="examId不能为空")
    private String examId;

    private Integer pageSize = 20;

    private String scrollToken;

}
