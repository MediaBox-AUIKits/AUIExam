package com.aliyuncs.aui.controller;

import com.aliyuncs.aui.common.utils.Result;
import com.aliyuncs.aui.common.utils.ValidatorUtils;
import com.aliyuncs.aui.dto.req.ImTokenRequestDto;
import com.aliyuncs.aui.dto.req.RoomCreateRequestDto;
import com.aliyuncs.aui.dto.res.ImTokenResponseDto;
import com.aliyuncs.aui.dto.res.NewImTokenResponseDto;
import com.aliyuncs.aui.dto.res.RoomInfoDto;
import com.aliyuncs.aui.service.RoomInfoService;
import com.aliyuncs.aui.service.RongCloudServer;
import com.google.common.collect.ImmutableMap;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections.CollectionUtils;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.apache.commons.lang.StringUtils;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

import static com.aliyuncs.aui.common.Constants.*;

/**
 * 互动考试管理的Controller V2版本
 * 主要是接入新的IM, 并兼容老的IM
 *
 * @author chunlei.zcl
 */
@RestController
@RequestMapping("/exam/v2")
@Slf4j
public class RoomInfoControllerV2 {

    @Resource
    private RoomInfoService roomInfoService;

    @Resource
    private RongCloudServer rongCloudServer;

    /**
     * 获取Im的token
     */
    @RequestMapping("/getIMToken")
    public Result getImToken(@RequestBody ImTokenRequestDto imTokenRequestDto) {

        ValidatorUtils.validateEntity(imTokenRequestDto);

        if (CollectionUtils.isEmpty(imTokenRequestDto.getImServer())) {
            return Result.invalidParam();
        }

        for (String s : imTokenRequestDto.getImServer()) {
            if (!IM_OLD.equals(s) && !IM_NEW.equals(s) && !RONG_CLOUD.equals(s)) {
                return Result.invalidParam();
            }
        }

        NewImTokenResponseDto newImTokenResponseDto = null;
        Map<String, Object> result = new HashMap<>();
        if (imTokenRequestDto.getImServer().contains(IM_OLD)) {
            ImTokenResponseDto imTokenResDto = roomInfoService.getImToken(imTokenRequestDto);
            if (imTokenResDto != null) {
                result.put("aliyunOldIm", ImmutableMap.<String, String>builder().put("accessToken", imTokenResDto.getAccessToken())
                        .put("refreshToken", imTokenResDto.getAccessToken()).build());
            }
        }

        if (imTokenRequestDto.getImServer().contains(IM_NEW)) {
            newImTokenResponseDto = roomInfoService.getNewImToken(imTokenRequestDto);
            if (newImTokenResponseDto != null) {
                result.put("aliyunNewIm", newImTokenResponseDto);
            }
        }

        if (imTokenRequestDto.getImServer().contains(RONG_CLOUD)) {
            String rongCloudToken = rongCloudServer.getToken(imTokenRequestDto.getUserId(), imTokenRequestDto.getUserId(), "");
            if (StringUtils.isNotEmpty(rongCloudToken)) {
                result.put("rongToken", rongCloudToken);
            }
        }

        return Result.ok(result);
    }

    @RequestMapping("/createRoom")
    public Result createRoomInfo(@RequestBody RoomCreateRequestDto roomCreateRequestDto) {

        ValidatorUtils.validateEntity(roomCreateRequestDto);

        if (CollectionUtils.isEmpty(roomCreateRequestDto.getImServer())) {
            return Result.invalidParam();
        }
        for (String s : roomCreateRequestDto.getImServer()) {
            if (!IM_OLD.equals(s) && !IM_NEW.equals(s) && !RONG_CLOUD.equals(s)) {
                return Result.invalidParam();
            }
        }

        RoomInfoDto roomInfo = roomInfoService.createRoomInfo(roomCreateRequestDto);
        if (roomInfo != null) {
            return Result.ok(roomInfo);
        }

        return Result.error();
    }
}
