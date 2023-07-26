package com.aliyuncs.aui.common.utils;

import lombok.Data;

import java.util.Map;

/**
 * 返回数据
 *
 */
@Data
public class Result {

	private boolean success = true;

	private Object data;

	private String errorCode;

	private String errorMsg;
	
	public static Result error() {
		return error(500, "服务器异常，请稍后重试");
	}

	public static Result error(Object data) {
		return error(500, data, "服务器异常，请稍后重试");
	}

	public static Result notFound() {
		return error(404, "未查询到");
	}

	public static Result invalidParam() {
		return error(401, "参数错误");
	}
	
	public static Result error(String msg) {
		return error(500, msg);
	}
	
	public static Result error(int code, String msg) {
		return error(code, null, msg);
	}

	public static Result error(int code, Object data, String msg) {
		Result r = new Result();
		r.setData(data);
		r.setSuccess(false);
		r.setErrorCode(String.valueOf(code));
		r.setErrorMsg(msg);
		return r;
	}
	
	public static Result ok(Map<String, Object> map) {
		Result r = new Result();
		r.data = map;
		return r;
	}

	public static Result ok(Object data) {
		Result r = new Result();
		r.data = data;
		return r;
	}
	
	public static Result ok() {
		return new Result();
	}

}
