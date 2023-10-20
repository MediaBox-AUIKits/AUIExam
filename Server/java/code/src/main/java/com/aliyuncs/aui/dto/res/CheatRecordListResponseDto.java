package com.aliyuncs.aui.dto.res;

import com.aliyuncs.aui.entity.CheatRecordEntity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 作弊检测信息DTO
 *
 * @author chunlei.zcl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheatRecordListResponseDto {

    private List<CheatRecordEntity> cheatRecordEntitys;

    private String scrollToken;
}
