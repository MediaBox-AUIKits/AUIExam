package com.aliyuncs.aui.service;

import com.aliyuncs.aui.dto.req.CheatRecordAddRequestDto;
import com.aliyuncs.aui.dto.req.CheatRecordListRequestDto;
import com.aliyuncs.aui.dto.res.CheatRecordListResponseDto;
import com.aliyuncs.aui.entity.CheatRecordEntity;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 *  作弊信息服务
 *  @author chunlei.zcl
 */
public interface CheatRecordService extends IService<CheatRecordEntity> {

    /**
    * 批量添加作弊信息
    * @author chunlei.zcl
    */
    boolean addCheatRecord(CheatRecordAddRequestDto cheatRecordAddRequestDto);

    /**
     * 获取防作弊配置
     * @author chunlei.zcl
     */
    CheatRecordListResponseDto listCheatRecord(CheatRecordListRequestDto cheatRecordListRequestDto);
}

