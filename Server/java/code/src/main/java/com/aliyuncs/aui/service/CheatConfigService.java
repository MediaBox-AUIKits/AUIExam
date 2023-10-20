package com.aliyuncs.aui.service;

import com.aliyuncs.aui.dto.req.CheatConfigGetRequestDto;
import com.aliyuncs.aui.dto.req.CheatConfigSetRequestDto;
import com.aliyuncs.aui.entity.CheatConfigEntity;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 *  作弊配置服务
 *  @author chunlei.zcl
 */
public interface CheatConfigService extends IService<CheatConfigEntity> {

    /**
    * 创建考场上传防作弊配置
    * @author chunlei.zcl
    */
    boolean setCheatConfig(CheatConfigSetRequestDto cheatConfigSetRequestDto);

    /**
     * 获取防作弊配置
     * @author chunlei.zcl
     */
    CheatConfigEntity getCheatConfig(CheatConfigGetRequestDto cheatConfigGetRequestDto);
}

