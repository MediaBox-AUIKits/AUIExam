package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 添加作弊信息
 * @author chunlei.zcl
 */
@Data
@ApiModel(value = "添加作弊信息")
public class CheatRecordAddRequestDto {

    @ApiModelProperty(value = "考场Id")
    @NotBlank(message="examId不能为空")
    private String examId;

    @ApiModelProperty(value = "具体作弊信息,json数组")
    @NotBlank(message="data不能为空")
    private String data;

}
