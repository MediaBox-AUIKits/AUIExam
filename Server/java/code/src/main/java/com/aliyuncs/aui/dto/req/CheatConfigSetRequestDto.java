package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 创建考场上传防作弊配置
 * @author chunlei.zcl
 */
@Data
@ApiModel(value = "创建考场上传防作弊配置")
public class CheatConfigSetRequestDto {

    @ApiModelProperty(value = "考场Id")
    @NotBlank(message="examId不能为空")
    private String examId;

    @ApiModelProperty(value = "具体配置信息,json串")
    @NotBlank(message="data不能为空")
    private String data;

    @ApiModelProperty(value = "创建者")
    private String creator;

}
