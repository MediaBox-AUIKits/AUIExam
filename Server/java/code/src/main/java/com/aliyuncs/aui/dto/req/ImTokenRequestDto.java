package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 获取IM服务Token的请求参数
 * @author chunlei.zcl
 */
@Data
@ApiModel(value = "获取IM服务Token的请求参数")
public class ImTokenRequestDto {
    @ApiModelProperty(value = "用户Id")
    @NotBlank(message="userId不能为空")
    private String userId;

    @ApiModelProperty(value = "设备Id")
    @NotBlank(message="deviceId不能为空")
    private String deviceId;
    @ApiModelProperty(value = "设备类型")
    @NotBlank(message="deviceType不能为空")
    private String deviceType;

}
