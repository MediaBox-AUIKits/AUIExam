package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.validation.constraints.NotNull;

/**
 * 查询系统音频列表
 *
 * @author chunlei.zcl
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ApiModel(value = "查询系统音频列表")
public class SelectAudioRequestDto {

    @ApiModelProperty(value = "名字")
    private String name;

    @Builder.Default
    private Integer pageNum = 1;

    @Builder.Default
    private Integer pageSize = 10;

    /**
     * 分类
     */
    @NotNull(message = "classify不能为空")
    private Integer classify;


}
