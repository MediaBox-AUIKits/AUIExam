package com.aliyuncs.aui.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.Date;

/**
 * 作弊信息Entity
 * 
 * @author chunlei.zcl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("cheat_record")
public class CheatRecordEntity implements Serializable {
	private static final long serialVersionUID = 1L;

	@TableId(type = IdType.INPUT)
	private Long id;
	/**
	 * 考试ID
	 */
	private String examId;

	/**
	 * 考场ID
	 */
	private String roomId;

	/**
	 * 考生id
	 */
	private String userId;

	/**
	 * 检测类型
	 */
	private String detectType;

	/**
	 * 考生主机位/副机位
	 */
	private String isMainMonitor;

	/**
	 * 检测时间
	 */
	private Date detectTime;

	/**
	 * 额外信息存储
	 */
	private String extraInfo;

	/**
	 * 创建时间
	 */
	private Date createdAt;
	/**
	 * 修改时间
	 */
	private Date updatedAt;
}
