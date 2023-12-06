package com.aliyuncs.aui.service.impl;

import com.aliyuncs.aui.dto.req.UploadConfigGetRequestDto;
import com.aliyuncs.aui.dto.res.UploadSTSInfoResponse;
import com.aliyuncs.aui.service.UploadService;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.aliyuncs.DefaultAcsClient;
import com.aliyuncs.exceptions.ClientException;
import com.aliyuncs.http.MethodType;
import com.aliyuncs.profile.DefaultProfile;
import com.aliyuncs.profile.IClientProfile;
import com.aliyuncs.auth.sts.AssumeRoleRequest;
import com.aliyuncs.auth.sts.AssumeRoleResponse;

/**
 * 获取上传 OSS 所需的 STS 数据服务实现类
 */
@Slf4j
@Service
public class UploadServiceImpl implements UploadService {

    @Value("${biz.ram.access_key_id}")
    private String accessKeyId;
    @Value("${biz.ram.access_key_secret}")
    private String accessKeySecret;
    @Value("${biz.upload.role_arn}")
    private String roleArn;
    @Value("${biz.upload.region}")
    private String region;
    @Value("${biz.upload.bucket}")
    private String bucket;
    @Value("${biz.upload.base_path}")
    private String basePath;

    /**
     * 获取接口
     */
    @Override
    public UploadSTSInfoResponse get(UploadConfigGetRequestDto uploadConfigGetRequestDto) {
        String mode = uploadConfigGetRequestDto.getMode();

        String policy;
        if (StringUtils.isNotEmpty(mode) && mode.equals("VOD")) {
            policy = "{\n" +
                    "  \"Version\": \"1\",\n" +
                    "  \"Statement\": [\n" +
                    "    {\n" +
                    "      \"Action\": \"vod:*\",\n" +
                    "      \"Resource\": \"*\",\n" +
                    "      \"Effect\": \"Allow\"\n" +
                    "    }\n" +
                    "  ]\n" +
                    "}";
        } else {
            // 以下Policy用于限制仅允许使用临时访问凭证向目标存储空间 bucket下的 basePath 目录上传文件。
            // 临时访问凭证最后获得的权限是步骤4设置的角色权限和该Policy设置权限的交集，即仅允许将文件上传至目标存储空间 bucket下的 basePath 目录。
            // 如果policy为空，则用户将获得该角色下所有权限。
            policy = "{\n" +
                    "    \"Version\": \"1\", \n" +
                    "    \"Statement\": [\n" +
                    "        {\n" +
                    "            \"Action\": [\n" +
                    "                \"oss:PutObject\"\n" +
                    "            ], \n" +
                    "            \"Resource\": [\n" +
                    "                \"acs:oss:*:*:" + bucket + basePath + "/*\" \n" +
                    "            ], \n" +
                    "            \"Effect\": \"Allow\"\n" +
                    "        }\n" +
                    "    ]\n" +
                    "}";
        }

        String endpoint = "sts." + region + ".aliyuncs.com";
        String roleSessionName = "AUIExamRoleSessionName";
        // 设置临时访问凭证的有效时间为3600秒。
        Long durationSeconds = 3600L;

        try {
            // regionId表示RAM的地域ID。以华东1（杭州）地域为例，regionID填写为cn-hangzhou。也可以保留默认值，默认值为空字符串（""）。
            String regionId = "";
            // 添加endpoint。适用于Java SDK 3.12.0及以上版本。
            DefaultProfile.addEndpoint(regionId, "Sts", endpoint);
            // 构造default profile。
            IClientProfile profile = DefaultProfile.getProfile(regionId, accessKeyId, accessKeySecret);
            // 构造client。
            DefaultAcsClient client = new DefaultAcsClient(profile);
            final AssumeRoleRequest request = new AssumeRoleRequest();
            // 适用于Java SDK 3.12.0及以上版本。
            request.setSysMethod(MethodType.POST);
            request.setRoleArn(roleArn);
            request.setRoleSessionName(roleSessionName);
            request.setPolicy(policy);
            request.setDurationSeconds(durationSeconds);
            final AssumeRoleResponse response = client.getAcsResponse(request);

            UploadSTSInfoResponse res = UploadSTSInfoResponse.builder()
                    .accessKeyId(response.getCredentials().getAccessKeyId())
                    .accessKeySecret(response.getCredentials().getAccessKeySecret())
                    .stsToken(response.getCredentials().getSecurityToken())
                    .expiration(response.getCredentials().getExpiration())
                    .region("oss-" + region)
                    .bucket(bucket).build();

            return res;
        } catch (ClientException e) {
            log.error("AssumeRoleRequest error.", e);
        }
        return null;
    }
}
