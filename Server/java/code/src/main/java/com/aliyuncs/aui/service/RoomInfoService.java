package com.aliyuncs.aui.service;

import com.aliyuncs.aui.dto.req.*;
import com.aliyuncs.aui.dto.res.*;
import com.aliyuncs.aui.entity.RoomInfoEntity;
import com.baomidou.mybatisplus.extension.service.IService;

import java.util.List;

/**
 *  房间服务
 *  @author chunlei.zcl
 */
public interface RoomInfoService extends IService<RoomInfoEntity> {

    /**
    * 获取IM的token
    * @author chunlei.zcl
    */
    ImTokenResponseDto getImToken(ImTokenRequestDto imTokenRequestDto);

    /**
     * 获取新IM的token
     * @author chunlei.zcl
     */
    NewImTokenResponseDto getNewImToken(ImTokenRequestDto imTokenRequestDto);

    /**
     * 创建房间
     * @author chunlei.zcl
     */
    RoomInfoDto createRoomInfo(RoomCreateRequestDto roomCreateRequestDto);

    /**
     * 获取房间详情
     * @author chunlei.zcl
     */
    RoomInfoDto get(RoomGetRequestDto roomGetRequestDto);

    ExamUserInfoDto getUserInfo(UserGetRequestDto userGetRequestDto);

    List<ExamUserInfoDto> userList(UserListRequestDto userListRequestDto);

    boolean endRoom(EndRoomRequestDto endRoomRequestDto);

    boolean updateRoomAudioStatus(RoomUpdateAudioStatusRequestDto roomUpdateAudioStatusRequestDto);

}

