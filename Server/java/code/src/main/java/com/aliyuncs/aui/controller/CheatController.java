package com.aliyuncs.aui.controller;

import com.aliyuncs.aui.common.utils.Result;
import com.aliyuncs.aui.common.utils.ValidatorUtils;
import com.aliyuncs.aui.dto.req.CheatConfigGetRequestDto;
import com.aliyuncs.aui.dto.req.CheatConfigSetRequestDto;
import com.aliyuncs.aui.dto.req.CheatRecordAddRequestDto;
import com.aliyuncs.aui.dto.req.CheatRecordListRequestDto;
import com.aliyuncs.aui.dto.res.CheatRecordListResponseDto;
import com.aliyuncs.aui.entity.CheatConfigEntity;
import com.aliyuncs.aui.service.CheatConfigService;
import com.aliyuncs.aui.service.CheatRecordService;
import lombok.extern.slf4j.Slf4j;
import org.apache.logging.log4j.util.Strings;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

/**
 *
 * 作弊规则Controller
 *
 * @author chunlei.zcl
 */
@RestController
@RequestMapping("/exam/cheat")
@Slf4j
public class CheatController {

    @Resource
    private CheatConfigService cheatConfigService;

    @Resource
    private CheatRecordService cheatConfigSetRequestDto;

    /**
     * 创建考场上传防作弊配置
     */
    @RequestMapping("/setCheatConfig")
    public Result setDetectConfig(@RequestBody CheatConfigSetRequestDto cheatConfigSetRequestDto) {

        ValidatorUtils.validateEntity(cheatConfigSetRequestDto);

        boolean reval = cheatConfigService.setCheatConfig(cheatConfigSetRequestDto);
        if (reval) {
            return Result.ok();
        }
        return Result.error();
    }

    /**
     * 获取考场防作弊配置
     */
    @RequestMapping("/getCheatConfig")
    public Result getCheatConfig(@RequestBody CheatConfigGetRequestDto cheatConfigGetRequestDto) {

        ValidatorUtils.validateEntity(cheatConfigGetRequestDto);

        CheatConfigEntity cheatConfigEntity = cheatConfigService.getCheatConfig(cheatConfigGetRequestDto);
        if (cheatConfigEntity != null) {
            return Result.ok(cheatConfigEntity);
        }
        return Result.notFound();
    }


    /**
     * 添加作弊信息
     */
    @RequestMapping("/addCheatRecord")
    public Result addCheatRecord(@RequestBody CheatRecordAddRequestDto cheatRecordAddRequestDto) {

        ValidatorUtils.validateEntity(cheatRecordAddRequestDto);

        boolean reval = cheatConfigSetRequestDto.addCheatRecord(cheatRecordAddRequestDto);
        if (reval) {
            return Result.ok();
        }
        return Result.error();
    }

    /**
     * 获取作弊检测信息
     */
    @RequestMapping("/listCheatRecord")
    public Result listCheatRecord(@RequestBody CheatRecordListRequestDto cheatRecordListRequestDto) {

        ValidatorUtils.validateEntity(cheatRecordListRequestDto);

        if (Strings.isNotEmpty(cheatRecordListRequestDto.getScrollToken())) {
            try {
                Long.parseLong(cheatRecordListRequestDto.getScrollToken());
            } catch (NumberFormatException e) {
                log.warn("scrollToken invalid. scrollToken:{}", cheatRecordListRequestDto.getScrollToken());
                return Result.invalidParam();
            }
        }

        CheatRecordListResponseDto cheatRecordListResponseDto = cheatConfigSetRequestDto.listCheatRecord(cheatRecordListRequestDto);

        if (cheatRecordListResponseDto != null) {
            return Result.ok(cheatRecordListResponseDto);
        }
        return Result.ok();
    }
}
