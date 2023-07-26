package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 结束考场
 * @author chunlei.zcl
 */
@Data
@ApiModel(value = "结束考场")
public class EndRoomRequestDto {

    @ApiModelProperty(value = "考场Id")
    @NotBlank(message="roomId不能为空")
    private String roomId;
}
