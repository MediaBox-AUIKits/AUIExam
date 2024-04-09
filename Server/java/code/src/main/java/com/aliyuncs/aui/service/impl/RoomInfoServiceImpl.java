package com.aliyuncs.aui.service.impl;

import com.alibaba.fastjson.JSONObject;
import com.aliyuncs.aui.dao.RoomInfoDao;
import com.aliyuncs.aui.dto.PullLiveInfo;
import com.aliyuncs.aui.dto.PushLiveInfo;
import com.aliyuncs.aui.dto.req.*;
import com.aliyuncs.aui.dto.res.ExamUserInfoDto;
import com.aliyuncs.aui.dto.res.ImTokenResponseDto;
import com.aliyuncs.aui.dto.res.NewImTokenResponseDto;
import com.aliyuncs.aui.dto.res.RoomInfoDto;
import com.aliyuncs.aui.entity.CheatConfigEntity;
import com.aliyuncs.aui.entity.ExamEntity;
import com.aliyuncs.aui.entity.RoomInfoEntity;
import com.aliyuncs.aui.service.CheatConfigService;
import com.aliyuncs.aui.service.ExamService;
import com.aliyuncs.aui.service.RoomInfoService;
import com.aliyuncs.aui.service.VideoCloudService;
import com.aliyuncs.aui.service.RongCloudServer;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.collections.CollectionUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang.time.DateUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.SynchronousQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import static com.aliyuncs.aui.common.Constants.*;

/**
 * 房间服务实现类
 *
 * @author chunlei.zcl
 */
@Service("roomInfosService")
@Slf4j
public class RoomInfoServiceImpl extends ServiceImpl<RoomInfoDao, RoomInfoEntity> implements RoomInfoService {

    /**
     * token过期时间
     */
    private static final long EXPIRE_TIME = 3600;

    /**
     * token秘钥
     */
    private static final String TOKEN_SECRET = "323assa2323.dqe223b434";

    @Value("${biz.live_mic.app_id}")
    private String liveMicAppId;

    @Resource
    private ExamService examinationsService;

    @Resource
    private CheatConfigService cheatConfigService;

    private static ThreadPoolExecutor THREAD_POOL = new ThreadPoolExecutor(0, Integer.MAX_VALUE,
            60L, TimeUnit.SECONDS,
            new SynchronousQueue<>());

    @Resource
    private VideoCloudService videoCloudService;

    @Resource
    private RongCloudServer rongCloudServer;

    @Override
    public ImTokenResponseDto getImToken(ImTokenRequestDto imTokenRequestDto) {

        return videoCloudService.getImToken(imTokenRequestDto);
    }

    @Override
    public NewImTokenResponseDto getNewImToken(ImTokenRequestDto imTokenRequestDto) {

        return videoCloudService.getNewImToken(imTokenRequestDto);
    }

    @Override
    public RoomInfoDto createRoomInfo(RoomCreateRequestDto roomCreateRequestDto) {

        long start = System.currentTimeMillis();

        String groupId = null;
        if (CollectionUtils.isNotEmpty(roomCreateRequestDto.getImServer())) {
            if (roomCreateRequestDto.getImServer().contains(IM_OLD)) {
                // 老师的ID，固定为"teacher1"，真正实现需要传入真实的创建考场老师ID
                groupId = videoCloudService.createMessageGroup("teacher1");
            }
            if (roomCreateRequestDto.getImServer().contains(IM_NEW)) {
                if (StringUtils.isEmpty(groupId)) {
                    groupId = UUID.randomUUID().toString().replaceAll("-", "");
                }
                groupId = videoCloudService.createNewImMessageGroup(groupId, "teacher1");
            }
            // 判断是否用融云
            if (roomCreateRequestDto.getImServer().contains(RONG_CLOUD)) {
                if (StringUtils.isEmpty(groupId)) {
                    groupId = UUID.randomUUID().toString().replaceAll("-", "");
                }
                groupId = rongCloudServer.createGroup(groupId, "examroom_" + groupId);
            }
        } else {
            // 兼容老的im逻辑
            groupId = videoCloudService.createMessageGroup("teacher1");
        }

        if (StringUtils.isEmpty(groupId)) {
            log.error("createMessageGroup error. author:{}", "teacher1");
            return null;
        }

        String examId = UUID.randomUUID().toString();
        ExamEntity examinationsEntity = ExamEntity.builder()
                .id(examId)
                .name("考试演示考场_" + examId)
                .startTime(new Date())
                .endTime(DateUtils.addMinutes(new Date(), 30))
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

        if (!examinationsService.save(examinationsEntity)) {
            log.error("save db error. examinationsEntity:{}", JSONObject.toJSONString(examinationsEntity));
            return null;
        }

        // 这里 roomId 和 groupId 为同一个
        // 加上 roomId 后缀，防止同一时间不同人体验 demo 时，相同的 userid 导致 IM 服务互相踢下线，真实场景需要改为真实的 userid
        String teacherId = "teacher1_" + groupId;
        RoomInfoEntity roomInfoEntity = RoomInfoEntity.builder()
                .id(groupId)
                .name(roomCreateRequestDto.getName())
                .examId(examId)
                .status(0)
                .audioStatus(0)
                .imGroupId(groupId)
                .createTeacher(teacherId)
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();
        if (!this.save(roomInfoEntity)) {
            log.error("save db error. roomInfoEntity:{}", JSONObject.toJSONString(roomInfoEntity));
            return null;
        }

        log.info("createRoomInfo. roomCreateRequestDto:{}, roomInfoDto:{}, consume:{}", JSONObject.toJSONString(roomCreateRequestDto),
                JSONObject.toJSONString(roomInfoEntity), (System.currentTimeMillis() - start));

        RoomInfoDto roomInfoDto = new RoomInfoDto();
        BeanUtils.copyProperties(roomInfoEntity, roomInfoDto);
        return roomInfoDto;
    }

    @Override
    public RoomInfoDto get(RoomGetRequestDto roomGetRequestDto) {

        RoomInfoEntity roomInfoEntity = this.getById(roomGetRequestDto.getRoomId());
        if (roomInfoEntity == null) {
            log.warn("get roomInfoEntity is null. roomGetRequestDto:{}", JSONObject.toJSONString(roomGetRequestDto));
            return null;
        }

        RoomInfoDto roomInfoDto = new RoomInfoDto();
        BeanUtils.copyProperties(roomInfoEntity, roomInfoDto);

        // 获取作弊配置信息
        CheatConfigGetRequestDto cheatConfigGetRequest = CheatConfigGetRequestDto.builder()
                .examId(roomGetRequestDto.getRoomId())
                .build();
        CheatConfigEntity cheatConfig = cheatConfigService.getCheatConfig(cheatConfigGetRequest);
        if (cheatConfig != null) {
            roomInfoDto.setCheatConfig(cheatConfig);
        }
        return roomInfoDto;
    }

    @Override
    public ExamUserInfoDto getUserInfo(UserGetRequestDto userGetRequestDto) {

        String userName = "";
        if (userGetRequestDto.getUserId().startsWith("examinee")) {
            // 这是简单的实现，约定学生的id为，examinee1_{roomId},examinee2_{roomId},examinee3,examinee4,examinee5
            userName = "学生" + userGetRequestDto.getUserId().charAt(8);
        } else {
            // 这是简单的实现，约定老师的id为，teacher1_{roomId}
            userName = "教师" + userGetRequestDto.getUserId().charAt(7);
        }

        RoomInfoEntity roomInfoEntity = this.getById(userGetRequestDto.getRoomId());
        if (roomInfoEntity == null) {
            log.warn("get roomInfoEntity is null. roomId:{}", userGetRequestDto.getRoomId());
            return null;
        }

        String streamName = roomInfoEntity.getExamId() + "-" + roomInfoEntity.getId() + "-" + userGetRequestDto.getUserId();

        PushLiveInfo pushLiveInfo = videoCloudService.getPushLiveInfo(streamName);
        PullLiveInfo pullLiveInfo = videoCloudService.getPullLiveInfo(streamName);

        String streamNameOfPc = roomInfoEntity.getExamId() + "-" + roomInfoEntity.getId() + "-" + userGetRequestDto.getUserId() + "_pc";

        PushLiveInfo pushLiveInfoOfPc = videoCloudService.getPushLiveInfo(streamNameOfPc);
        PullLiveInfo pullLiveInfoOfPc = videoCloudService.getPullLiveInfo(streamNameOfPc);

        return ExamUserInfoDto.builder()
                .id(userGetRequestDto.getUserId())
                .name(userName)
                .userStatus(0)
                .rtcPushUrl(pushLiveInfo.getRtsUrl())
                .rtcPullUrl(pullLiveInfo.getRtsUrl())
                .rtsPullUrl(pullLiveInfo.getRtsUrl())
                .pcRtcPushUrl(pushLiveInfoOfPc.getRtsUrl())
                .pcRtcPullUrl(pullLiveInfoOfPc.getRtsUrl())
                .pcRtsPullUrl(pullLiveInfoOfPc.getRtsUrl())
                .build();
    }

    @Override
    public List<ExamUserInfoDto> userList(UserListRequestDto userListRequestDto) {
        String roomId = userListRequestDto.getRoomId();

        List<ExamUserInfoDto> examUserInfos = new ArrayList(6);
        for (int i = 1; i < 6; i++) {
            UserGetRequestDto userGetRequestDto = new UserGetRequestDto();
            // 增加 roomId 后缀，避免不同客户体验demo时因相同userid导致的 IM 问题，真实开发请使用真实 userId
            userGetRequestDto.setUserId("examinee" + i + "_" + roomId);
            userGetRequestDto.setRoomId(userListRequestDto.getRoomId());
            examUserInfos.add(getUserInfo(userGetRequestDto));
        }
        return examUserInfos;
    }

    @Override
    public boolean endRoom(EndRoomRequestDto endRoomRequestDto) {

        RoomInfoEntity roomInfoEntity = this.getById(endRoomRequestDto.getRoomId());
        if (roomInfoEntity == null) {
            log.warn("get roomInfoEntity is null. roomId:{}", endRoomRequestDto.getRoomId());
            return false;
        }
        // 修改考场状态为“已结束”
        roomInfoEntity.setStatus(1);
        // 修改考场口播状态为“未口播”
        roomInfoEntity.setAudioStatus(0);
        // 修改考场记录更新时间
        roomInfoEntity.setUpdatedAt(new Date());
        return this.updateById(roomInfoEntity);
    }

    @Override
    public boolean updateRoomAudioStatus(RoomUpdateAudioStatusRequestDto roomUpdateAudioStatusRequestDto) {

        RoomInfoEntity roomInfoEntity = this.getById(roomUpdateAudioStatusRequestDto.getId());
        if (roomInfoEntity == null) {
            log.warn("get roomInfoEntity is null. roomId:{}", roomUpdateAudioStatusRequestDto.getId());
            return false;
        }
        // 修改考场口播状态为“未口播”
        roomInfoEntity.setAudioStatus(roomUpdateAudioStatusRequestDto.getAudioStatus());
        // 修改考场记录更新时间
        roomInfoEntity.setUpdatedAt(new Date());
        return this.updateById(roomInfoEntity);
    }


}