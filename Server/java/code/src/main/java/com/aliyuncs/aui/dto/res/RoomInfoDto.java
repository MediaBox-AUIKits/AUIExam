package com.aliyuncs.aui.dto.res;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

/**
 * 房间信息DTO
 *
 * @author chunlei.zcl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomInfoDto {

    private String id;
    /**
     * 创建时间
     */
    private Date createdAt;
    /**
     * 修改时间
     */
    private Date updatedAt;
    /**
     * 考场名称
     */
    private String name;
    /**
     * 考试ID
     */
    private String examId;
    /**
     * 考场状态, 0:进行中 1:已结束
     */
    private Integer status;
    /**
     * 考场口播状态，0:未口播 1:正在口播
     */
    private Integer audioStatus;
    /**
     * 消息组id
     */
    private String imGroupId;
    /**
     * 考场创建者id
     */
    private String createTeacher;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VodInfo {

        private Integer status;

        @JsonProperty("playlist")
        private List<PlayInfo> playInfos;
        
    }

    /**
    * 详见文档：https://help.aliyun.com/document_detail/436555.html
    */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlayInfo {

        @JsonProperty("bit_depth")
        private Integer bitDepth;
        @JsonProperty("bit_rate")
        private String bitRate;
        @JsonProperty("creation_time")
        private String creationTime;
        private String definition;
        private String duration;
        private Long encrypt;
        @JsonProperty("encrypt_type")
        private String encryptType;
        private String format;
        private String fps;
        @JsonProperty("hdr_type")
        private String hDRType;
        private long height;
        private long width;
        @JsonProperty("play_url")
        private String playUrl;
        private Long size;
        private String status;
        @JsonProperty("stream_type")
        private String streamType;
        @JsonProperty("watermark_id")
        private String watermarkId;

    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserStatus {

        private Boolean mute;

        @JsonProperty("mute_source")
        private List<String> muteSource;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Metrics {

        @JsonProperty("like_count")
        private Long likeCount;

        @JsonProperty("online_count")
        private Long onlineCount;

        private Long pv;

        private Long uv;

    }

}
