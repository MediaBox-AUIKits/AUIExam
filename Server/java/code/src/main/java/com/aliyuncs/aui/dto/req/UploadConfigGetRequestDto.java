package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import javax.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 获取上传 OSS 所需的 STS 数据
 */
@Data
@ApiModel(value = "获取上传 OSS 所需的 STS 数据")
public class UploadConfigGetRequestDto {
    @ApiModelProperty(value = "考试Id")
    @NotBlank(message="examId不能为空")
    private String examId;

    @ApiModelProperty(value = "模式，OSS 或 VOD")
    private String mode;
}