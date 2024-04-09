package com.aliyuncs.aui.service.impl;

import com.alibaba.fastjson.JSONObject;
import com.aliyuncs.aui.service.RongCloudServer;
import io.rong.RongCloud;
import io.rong.models.response.*;
import io.rong.models.user.UserModel;
import io.rong.methods.group.Group;
import io.rong.models.Result;
import io.rong.models.group.GroupMember;
import io.rong.models.group.GroupModel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;

/**
 * 融云服务实现类
 */
@Service
@Slf4j
public class RongCloudServerImpl implements RongCloudServer {

    private static final int RETRY = 2;
    private static RongCloud rongCloud;

    @Value("${biz.live_rongcloud_im.app_key}")
    private String appKey;

    @Value("${biz.live_rongcloud_im.app_secret}")
    private String appSecret;

    @PostConstruct
    public void init() {

        rongCloud = RongCloud.getInstance(appKey, appSecret);
    }

    /**
     * 注册用户，生成用户在融云的唯一身份标识 Token
     * 见文档：<a href="https://doc.rongcloud.cn/imserver/server/v1/user/register">...</a>
     */
    @Override
    public String getToken(String userId, String userName, String portrait) {

        UserModel userModel = new UserModel()
                .setId(userId)
                .setName(userName)
                .setPortrait(portrait);

        int i = 0;
        while (i++ < RETRY) {
            long start = System.currentTimeMillis();
            try {
                TokenResult result = rongCloud.user.register(userModel);
                log.info("register, userId:{}, userName:{}, consume:{}, result:{}", userId, userName, (System.currentTimeMillis() - start), JSONObject.toJSONString(result));
                if (result.code == 200) {
                    return result.getToken();
                }
            } catch (Exception e) {
                log.error("RongCloudServer.getToken error. userId:{}, userName:{}, e:{}", userId, userName, e.toString());
            }
        }
        return null;
    }

    @Override
    public String createGroup(String groupId, String name) {
        Group Group = rongCloud.group;

        /**
         * API 文档: https://doc.rongcloud.cn/imserver/server/v1/im-server-api-list-v1
         *
         *  这是简单的实现，约定学生的id为，examinee1_{roomId},examinee2_{roomId},examinee3_{roomId},examinee4_{roomId},examinee5_{roomId}
         *  约定老师 id 为 teacher1_{roomId} ，真实系统中请改用您的用户系统的 userid
         *  需要区分 PC主机位和手机副机位的用户ID，约定是加上 pc_ 的前缀
         *  实际业务开发需要改为您的真实用户id
         *
         *  为了解决不同客户体验 demo 时使用同一个 userid 登录导致 IM 服务互相踢下线的问题，所有体验用户id均加上 _{roomId} 后缀
         *  又因 groupId 和 roomId 为同一个，所以这里使用 groupId
         */
        GroupMember[] members = {
                new GroupMember().setId("teacher1_" + groupId),
                new GroupMember().setId("examinee1_" + groupId),
                new GroupMember().setId("examinee2_" + groupId),
                new GroupMember().setId("examinee3_" + groupId),
                new GroupMember().setId("examinee4_" + groupId),
                new GroupMember().setId("examinee5_" + groupId),
                new GroupMember().setId("pc_examinee1_" + groupId),
                new GroupMember().setId("pc_examinee2_" + groupId),
                new GroupMember().setId("pc_examinee3_" + groupId),
                new GroupMember().setId("pc_examinee4_" + groupId),
                new GroupMember().setId("pc_examinee5_" + groupId)
        };

        GroupModel group = new GroupModel()
                .setId(groupId)
                .setMembers(members)
                .setName(name);

        int i = 0;
        while (i++ < RETRY) {
            long start = System.currentTimeMillis();
            try {
                Result groupCreateResult = (Result)Group.create(group);
                log.info("createGroup, groupId:{}, name:{}, consume:{}, result:{}", group.getId(), group.getName(), (System.currentTimeMillis() - start), JSONObject.toJSONString(groupCreateResult));
                if (groupCreateResult.getCode() == 200) {
                    log.info("rongCloud groupId: success");
                    return groupId;
                }
            } catch (Exception e) {
                log.error("RongCloudServer.createGroup error. groupId:{}, name:{}, e:{}", groupId, name, e.toString());
            }
        }
        return null;
    }
}
