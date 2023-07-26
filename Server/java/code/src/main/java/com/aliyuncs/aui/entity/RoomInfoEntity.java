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
 * 考场Entity
 * 
 * @author chunlei.zcl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("exam_room_infos")
public class RoomInfoEntity implements Serializable {
	private static final long serialVersionUID = 1L;

	@TableId(type = IdType.INPUT)
	private String id;
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
	/**
	 * 创建时间
	 */
	private Date createdAt;
	/**
	 * 修改时间
	 */
	private Date updatedAt;

}
