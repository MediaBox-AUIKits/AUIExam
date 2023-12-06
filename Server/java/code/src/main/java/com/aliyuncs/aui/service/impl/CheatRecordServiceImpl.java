package com.aliyuncs.aui.service.impl;

import com.alibaba.fastjson.JSONObject;
import com.aliyuncs.aui.dao.CheatRecordDao;
import com.aliyuncs.aui.dto.req.CheatRecordAddRequestDto;
import com.aliyuncs.aui.dto.req.CheatRecordListRequestDto;
import com.aliyuncs.aui.dto.res.CheatRecordListResponseDto;
import com.aliyuncs.aui.entity.CheatRecordEntity;
import com.aliyuncs.aui.service.CheatRecordService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.apache.logging.log4j.util.Strings;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.Collections;
import java.util.Date;
import java.util.List;

/**
 * 作弊信息服务 实现
 *
 * @author chunlei.zcl
 */
@Service
@Slf4j
public class CheatRecordServiceImpl extends ServiceImpl<CheatRecordDao, CheatRecordEntity> implements CheatRecordService {
    @Override
    public boolean addCheatRecord(CheatRecordAddRequestDto cheatRecordAddRequestDto) {

        List<CheatRecordEntity> cheatRecordEntities = JSONObject.parseArray(cheatRecordAddRequestDto.getData(), CheatRecordEntity.class);
        if (CollectionUtils.isEmpty(cheatRecordEntities)) {
            log.error("cheatRecordEntities is empty.");
            return false;
        }

        for (CheatRecordEntity cheatRecordEntity : cheatRecordEntities) {
            cheatRecordEntity.setExamId(cheatRecordAddRequestDto.getExamId());
            cheatRecordEntity.setRoomId(cheatRecordAddRequestDto.getRoomId());
            cheatRecordEntity.setCreatedAt(new Date());
            cheatRecordEntity.setUpdatedAt(cheatRecordEntity.getCreatedAt());
        }

        return this.saveBatch(cheatRecordEntities);
    }

    @Override
    public CheatRecordListResponseDto listCheatRecord(CheatRecordListRequestDto cheatRecordListRequestDto) {

        QueryWrapper<CheatRecordEntity> queryWrapper = new QueryWrapper<>();

        LambdaQueryWrapper<CheatRecordEntity> cheatRecordEntityLambdaQueryWrapper = queryWrapper.lambda();

        if (Strings.isNotEmpty(cheatRecordListRequestDto.getExamId())) {
            cheatRecordEntityLambdaQueryWrapper.eq(CheatRecordEntity::getExamId, cheatRecordListRequestDto.getExamId());
        }

        if (Strings.isNotEmpty(cheatRecordListRequestDto.getRoomId())) {
            cheatRecordEntityLambdaQueryWrapper.eq(CheatRecordEntity::getRoomId, cheatRecordListRequestDto.getRoomId());
        }

        cheatRecordEntityLambdaQueryWrapper.orderByDesc(CheatRecordEntity::getId);

        if (Strings.isNotEmpty(cheatRecordListRequestDto.getScrollToken())) {
            cheatRecordEntityLambdaQueryWrapper.lt(CheatRecordEntity::getId, Long.parseLong(cheatRecordListRequestDto.getScrollToken()));
        }
        cheatRecordEntityLambdaQueryWrapper.last(String.format("limit %s", cheatRecordListRequestDto.getPageSize()));

        List<CheatRecordEntity> cheatRecordEntityList = this.list(cheatRecordEntityLambdaQueryWrapper);
        if (CollectionUtils.isEmpty(cheatRecordEntityList)) {
            log.warn("listCheatRecord is empty");
            return CheatRecordListResponseDto.builder().cheatRecordEntitys(Collections.EMPTY_LIST).build();
        } else {
            CheatRecordEntity cheatRecordEntity = cheatRecordEntityList.get(cheatRecordEntityList.size() - 1);
            cheatRecordListRequestDto.setScrollToken(String.valueOf(cheatRecordEntity.getId()));
            String scrollToken = null;
            int count = countCheatRecord(cheatRecordListRequestDto);
            if (count > 0) {
                scrollToken = String.valueOf(cheatRecordEntity.getId());
            }
            return CheatRecordListResponseDto.builder().cheatRecordEntitys(cheatRecordEntityList)
                    .scrollToken(scrollToken).build();
        }
    }

    private int countCheatRecord(CheatRecordListRequestDto cheatRecordListRequestDto) {

        QueryWrapper<CheatRecordEntity> queryWrapper = new QueryWrapper<>();
        LambdaQueryWrapper<CheatRecordEntity> cheatRecordEntityLambdaQueryWrapper = queryWrapper.lambda().
                eq(CheatRecordEntity::getExamId, cheatRecordListRequestDto.getExamId());
        if (Strings.isNotEmpty(cheatRecordListRequestDto.getScrollToken())) {
            cheatRecordEntityLambdaQueryWrapper.lt(CheatRecordEntity::getId, Long.parseLong(cheatRecordListRequestDto.getScrollToken()));
        }
        return this.count(cheatRecordEntityLambdaQueryWrapper);
    }
}
