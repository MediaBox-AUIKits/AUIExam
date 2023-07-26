package com.aliyuncs.aui.dto.req;

import io.swagger.annotations.ApiModel;
import lombok.Builder;
import lombok.Data;

import javax.validation.constraints.NotBlank;

/**
 * 口播音频选择
 *
 * @author chunlei.zcl
 */
@Data
@Builder
@ApiModel(value = "考场口播状态")
public class AudioSelectRequestDto {

    @Builder.Default
    private Integer pageNum = 1;

    @Builder.Default
    private Integer pageSize = 10;

    /**
     * 名字
     */
    @NotBlank(message = "name不能为空")
    private String name;

    /**
     * 分类
     */
    @NotBlank(message = "classify不能为空")
    private Integer classify;

}
