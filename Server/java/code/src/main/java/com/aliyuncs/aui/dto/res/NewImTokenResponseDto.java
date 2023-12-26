package com.aliyuncs.aui.dto.res;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * NewImTokenResponseDto
 *
 * @author chunlei.zcl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NewImTokenResponseDto {

    @JsonProperty("appId")
    private String appId;

    @JsonProperty("appSign")
    private String appSign;

    @JsonProperty("appToken")
    private String appToken;

    private Auth auth;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Auth {

        @JsonProperty("userId")
        private String userId;

        private String nonce;

        private long timestamp;

        private String role;
    }
}
