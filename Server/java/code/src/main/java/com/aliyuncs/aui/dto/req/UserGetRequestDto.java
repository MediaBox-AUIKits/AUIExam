package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 获取用户信息
 * @author chunlei.zcl
 */
@Data
@ApiModel(value = "获取用户信息")
public class UserGetRequestDto {
    @ApiModelProperty(value = "userId")
    @NotBlank(message="userId不能为空")
    private String userId;

    @ApiModelProperty(value = "考场Id")
    @NotBlank(message="roomId不能为空")
    private String roomId;
}
