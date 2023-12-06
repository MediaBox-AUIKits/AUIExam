package com.aliyuncs.aui.controller;

import com.aliyuncs.aui.common.utils.Result;
import com.aliyuncs.aui.common.utils.ValidatorUtils;
import com.aliyuncs.aui.dto.req.*;
import com.aliyuncs.aui.dto.res.*;
import com.aliyuncs.aui.service.ExamService;
import com.aliyuncs.aui.service.RoomInfoService;
import com.aliyuncs.aui.service.UploadService;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections.CollectionUtils;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 直播间管理的Controller
 *
 * @author chunlei.zcl
 */
@RestController
@RequestMapping("/exam")
@Slf4j
public class RoomInfoController {

    @Resource
    private RoomInfoService roomInfoService;

    @Resource
    private ExamService examinationsService;

    @Resource
    private UploadService uploadService;

    /**
     * 获取Im的token
     */
    @RequestMapping("/getIMToken")
    public Result getImToken(@RequestBody ImTokenRequestDto imTokenRequestDto) {

        ValidatorUtils.validateEntity(imTokenRequestDto);

        ImTokenResponseDto imTokenResDto = roomInfoService.getImToken(imTokenRequestDto);
        if (imTokenResDto != null) {
            Map<String, Object> map = new HashMap<>(2);
            map.put("accessToken", imTokenResDto.getAccessToken());
            map.put("refreshToken", imTokenResDto.getAccessToken());
            return Result.ok(map);
        }

        return Result.error();
    }

    /**
     * 创建考场
     */
    @RequestMapping("/createRoom")
    public Result createRoomInfo(@RequestBody RoomCreateRequestDto roomCreateRequestDto) {

        ValidatorUtils.validateEntity(roomCreateRequestDto);

        RoomInfoDto roomInfo = roomInfoService.createRoomInfo(roomCreateRequestDto);
        if (roomInfo != null) {
            return Result.ok(roomInfo);
        }

        return Result.error();
    }

    /**
     * 获取考场信息
     */
    @RequestMapping("/roomInfo")
    public Result roomInfo(RoomGetRequestDto roomGetRequestDto) {

        ValidatorUtils.validateEntity(roomGetRequestDto);

        RoomInfoDto roomInfo = roomInfoService.get(roomGetRequestDto);
        if (roomInfo != null) {
            return Result.ok(roomInfo);
        }
        return Result.notFound();
    }

    /**
     * 获取考试信息
     */
    @RequestMapping("/examInfo")
    public Result examInfo(ExamGetRequestDto examGetRequestDto) {

        ValidatorUtils.validateEntity(examGetRequestDto);

        ExamInfoDto examInfoDto = examinationsService.get(examGetRequestDto);
        if (examInfoDto != null) {
            return Result.ok(examInfoDto);
        }
        return Result.notFound();
    }

    /**
     * 获取用户信息
     */
    @RequestMapping("/userInfo")
    public Result userInfo(UserGetRequestDto userGetRequestDto) {

        ValidatorUtils.validateEntity(userGetRequestDto);

        ExamUserInfoDto examUserInfoDto = roomInfoService.getUserInfo(userGetRequestDto);
        if (examUserInfoDto != null) {
            return Result.ok(examUserInfoDto);
        }
        return Result.notFound();
    }

    /**
     * 获取考场的学生列表
     */
    @RequestMapping("/userList")
    public Result userList(UserListRequestDto userListRequestDto) {

        ValidatorUtils.validateEntity(userListRequestDto);

        List<ExamUserInfoDto> examUserInfoDtos = roomInfoService.userList(userListRequestDto);
        if (CollectionUtils.isNotEmpty(examUserInfoDtos)) {
            return Result.ok(examUserInfoDtos);
        }
        return Result.notFound();
    }

    /**
     * 结束考场
     */
    @RequestMapping("/endRoom")
    public Result endRoom(EndRoomRequestDto endRoomRequestDto) {

        ValidatorUtils.validateEntity(endRoomRequestDto);
        boolean result = roomInfoService.endRoom(endRoomRequestDto);
        return result ? Result.ok(true) : Result.error(false);
    }

    /**
     * 更新考场口播状态
     */
    @RequestMapping("/updateRoomAudioStatus")
    public Result updateRoomAudioStatus(@RequestBody RoomUpdateAudioStatusRequestDto roomUpdateAudioStatusRequestDto) {

        ValidatorUtils.validateEntity(roomUpdateAudioStatusRequestDto);
        boolean result = roomInfoService.updateRoomAudioStatus(roomUpdateAudioStatusRequestDto);
        return result ? Result.ok(true) : Result.error(false);
    }

    /**
     * 查询系统音频列表
     */
    @RequestMapping("/selectAudio")
    public Result selectAudio(@RequestBody SelectAudioRequestDto selectAudioRequestDto) {

        ValidatorUtils.validateEntity(selectAudioRequestDto);
        SelectAudioDataDto selectAudioDataDto = examinationsService.selectAudio(selectAudioRequestDto);
        if (selectAudioDataDto != null) {
            return Result.ok(selectAudioDataDto);
        }
        return Result.notFound();
    }

    /**
     * 获取上传 OSS 所需的 STS 数据
     */
    @RequestMapping("/getOssConfig")
    public Result getOssConfig(UploadConfigGetRequestDto uploadConfigGetRequestDto) {

        ValidatorUtils.validateEntity(uploadConfigGetRequestDto);

        UploadSTSInfoResponse infoResponse = uploadService.get(uploadConfigGetRequestDto);
        if (infoResponse != null) {
            return Result.ok(infoResponse);
        }
        return Result.error(false);
    }
}
