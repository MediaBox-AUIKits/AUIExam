package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;

/**
 * 获取考场防作弊配置
 * @author chunlei.zcl
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ApiModel(value = "获取考场防作弊配置")
public class CheatConfigGetRequestDto {

    @ApiModelProperty(value = "考场Id")
    @NotBlank(message="examId不能为空")
    private String examId;

}
