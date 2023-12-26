package com.aliyuncs.aui.dto.req;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotBlank;
import java.util.List;

/**
 * 创建考场请求参数
 * @author chunlei.zcl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ApiModel(value = "创建考场请求参数")
public class RoomCreateRequestDto {
    @ApiModelProperty(value = "考场名称")
    @NotBlank(message="name不能为空")
    private String name;


    @ApiModelProperty(value = "im群列表")
    @JsonProperty("imServer")
    private List<String> imServer;
}
