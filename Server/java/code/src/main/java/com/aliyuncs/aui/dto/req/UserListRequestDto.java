package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 获取用户列表
 * @author chunlei.zcl
 */
@Data
@ApiModel(value = "获取用户列表")
public class UserListRequestDto {

    @ApiModelProperty(value = "考场Id")
    @NotBlank(message="roomId不能为空")
    private String roomId;
}
