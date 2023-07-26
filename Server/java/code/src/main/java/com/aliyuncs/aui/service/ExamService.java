package com.aliyuncs.aui.service;

import com.aliyuncs.aui.dto.req.ExamGetRequestDto;
import com.aliyuncs.aui.dto.req.SelectAudioRequestDto;
import com.aliyuncs.aui.dto.res.ExamInfoDto;
import com.aliyuncs.aui.dto.res.SelectAudioDataDto;
import com.aliyuncs.aui.entity.ExamEntity;
import com.baomidou.mybatisplus.extension.service.IService;

/**
 *  考试服务
 *  @author chunlei.zcl
 */
public interface ExamService extends IService<ExamEntity> {

    ExamInfoDto get(ExamGetRequestDto examGetRequestDto);


    SelectAudioDataDto selectAudio(SelectAudioRequestDto selectAudioRequestDto);
}

