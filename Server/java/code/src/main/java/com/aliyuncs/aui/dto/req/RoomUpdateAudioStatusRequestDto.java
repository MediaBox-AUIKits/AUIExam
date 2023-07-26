package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

/**
 * 考场口播状态
 * @author chunlei.zcl
 */
@Data
@ApiModel(value = "考场口播状态")
public class RoomUpdateAudioStatusRequestDto {

    @ApiModelProperty(value = "考场Id")
    @NotBlank(message="id不能为空")
    private String id;

    /**
    * 考场口播状态, 0：未口播,1：正在口播
    */
    @ApiModelProperty(value = "考场口播状态")
    @NotNull(message="audioStatus不能为空")
    private Integer audioStatus;

}
