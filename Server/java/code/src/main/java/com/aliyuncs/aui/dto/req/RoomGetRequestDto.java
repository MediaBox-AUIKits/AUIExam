package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 获取考场信息
 * @author chunlei.zcl
 */
@Data
@ApiModel(value = "获取考场信息")
public class RoomGetRequestDto {
    @ApiModelProperty(value = "房间Id")
    @NotBlank(message="roomId不能为空")
    private String roomId;

}
