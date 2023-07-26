package com.aliyuncs.aui.service.impl;

import com.alibaba.fastjson.JSONObject;
import com.aliyuncs.aui.dao.ExamDao;
import com.aliyuncs.aui.dto.req.ExamGetRequestDto;
import com.aliyuncs.aui.dto.req.SelectAudioRequestDto;
import com.aliyuncs.aui.dto.res.ExamAudioInfoDto;
import com.aliyuncs.aui.dto.res.ExamInfoDto;
import com.aliyuncs.aui.dto.res.SelectAudioDataDto;
import com.aliyuncs.aui.entity.ExamEntity;
import com.aliyuncs.aui.service.ExamService;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * 考试服务实现类
 *
 * @author chunlei.zcl
 */
@Service("examinationsService")
@Slf4j
public class ExamServiceImpl extends ServiceImpl<ExamDao, ExamEntity> implements ExamService {


    @Override
    public ExamInfoDto get(ExamGetRequestDto examGetRequestDto) {

        ExamEntity examEntity = this.getById(examGetRequestDto.getExamId());
        if (examEntity == null) {
            log.warn("get examEntity is null. examGetRequestDto:{}", JSONObject.toJSONString(examGetRequestDto));
            return null;
        }

        ExamInfoDto examInfoDto = new ExamInfoDto();
        BeanUtils.copyProperties(examEntity, examInfoDto);

        SelectAudioDataDto selectAudioDataDto = selectAudio(new SelectAudioRequestDto());
        if (selectAudioDataDto != null) {
            examInfoDto.setAudioInfos(selectAudioDataDto.getList());
        }

        return examInfoDto;
    }


    /**
     * 查询系统音频列表，此处实现并未实际根据输入参数查询数据库返回音频列表，作为一种示范，hardcode了返回列表
     * @author chunlei.zcl
     */
    @Override
    public SelectAudioDataDto selectAudio(SelectAudioRequestDto selectAudioRequestDto) {

        List<ExamAudioInfoDto> examAudioInfoDtos = new ArrayList<>();

        examAudioInfoDtos.add(ExamAudioInfoDto.builder().id("0001").classify(2).name("考前须知")
                .url("https://ice-pub-media.myalicdn.com/vod-demo/mp3/%E8%80%83%E5%89%8D%E9%A1%BB%E7%9F%A5.mp3").build());

        examAudioInfoDtos.add(ExamAudioInfoDto.builder().id("0002").classify(2).name("考试结束")
                .url("https://ice-pub-media.myalicdn.com/vod-demo/mp3/%E8%80%83%E8%AF%95%E7%BB%93%E6%9D%9F.mp3").build());

        examAudioInfoDtos.add(ExamAudioInfoDto.builder().id("0003").classify(2).name("背景音乐")
                .url("https://ice-pub-media.myalicdn.com/vod-demo/Funshine.mp3").build());

        return SelectAudioDataDto.builder().pageNum(selectAudioRequestDto.getPageNum())
                .pageSize(selectAudioRequestDto.getPageSize()).total(examAudioInfoDtos.size())
                .list(examAudioInfoDtos).build();
    }
}