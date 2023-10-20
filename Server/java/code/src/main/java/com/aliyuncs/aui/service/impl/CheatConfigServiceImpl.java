package com.aliyuncs.aui.service.impl;

import com.aliyuncs.aui.dao.CheatConfigDao;
import com.aliyuncs.aui.dto.req.CheatConfigGetRequestDto;
import com.aliyuncs.aui.dto.req.CheatConfigSetRequestDto;
import com.aliyuncs.aui.entity.CheatConfigEntity;
import com.aliyuncs.aui.service.CheatConfigService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Date;

/**
 * 作弊配置服务 实现
 *
 * @author chunlei.zcl
 */
@Service
@Slf4j
public class CheatConfigServiceImpl extends ServiceImpl<CheatConfigDao, CheatConfigEntity> implements CheatConfigService {
    @Override
    public boolean setCheatConfig(CheatConfigSetRequestDto cheatConfigSetRequestDto) {

        CheatConfigEntity entity = CheatConfigEntity.builder()
                .examId(cheatConfigSetRequestDto.getExamId())
                .data(cheatConfigSetRequestDto.getData())
                .creator(cheatConfigSetRequestDto.getCreator())
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();
        return this.saveOrUpdate(entity);
    }

    @Override
    public CheatConfigEntity getCheatConfig(CheatConfigGetRequestDto cheatConfigGetRequestDto) {
        return this.getById(cheatConfigGetRequestDto.getExamId());
    }
}
