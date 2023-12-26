package com.aliyuncs.aui.service;

/**
 * 融云IM服务
 */
public interface RongCloudServer {

    /**
     * 获取Token
     */
    String getToken(String userId, String userName, String portrait);


    /**
     * 创建群组
     */
    String createGroup(String groupId, String name);

}
