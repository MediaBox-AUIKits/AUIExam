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
 * 作弊配置Entity
 * 
 * @author chunlei.zcl
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@TableName("cheat_config")
public class CheatConfigEntity implements Serializable {
	private static final long serialVersionUID = 1L;

	/**
	 * 考试ID
	 */
	@TableId(type = IdType.INPUT)
	private String examId;

	/**
	 * 具体配置
	 */
	private String data;
	/**
	 * 创建者
	 */
	private String creator;
	/**
	 * 创建时间
	 */
	private Date createdAt;
	/**
	 * 修改时间
	 */
	private Date updatedAt;
}
