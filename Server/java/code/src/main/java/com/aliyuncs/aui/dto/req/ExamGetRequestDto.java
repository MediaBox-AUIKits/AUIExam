package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 获取考试信息
 * @author chunlei.zcl
 */
@Data
@ApiModel(value = "获取考试信息")
public class ExamGetRequestDto {
    @ApiModelProperty(value = "考试Id")
    @NotBlank(message="examId不能为空")
    private String examId;

}
