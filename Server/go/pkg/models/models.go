package models

import (
	"time"
)

// 考试信息-对应数据
type Examination struct {
	// 考试ID
	ID string `sql:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`

	// 考试名称
	Name string `json:"name"`

	// 开始时间
	StartTime time.Time `gorm:"type:datetime;time_format:2006/01/0215:04:05"  json:"startTime"`

	// 结束时间
	EndTime time.Time `gorm:"type:datetime;time_format:2006/01/0215:04:05"  json:"endTime"`

	// 创建时间
	CreatedAt time.Time `json:"createdAt" gorm:"index:idx_create_at"`
	// 更新时间
	UpdatedAt time.Time `json:"updatedAt"`

	// 自动播放的音频 radioInfo
	RadioInfo interface{} `gorm:"-" json:"radioInfo"`
	// 需要老师手动播放的音频
	AudioInfo []*ExamAudioInfo `gorm:"-" json:"audioInfo"`
}

// 考场信息-对应数据库
type ExamRoomInfo struct {
	// 考场ID
	ID string `sql:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`

	// 考场名称
	Name string `json:"name"`

	// 考试ID
	ExamId string `json:"examId"`

	// 考场状态, 0:进行中 1:已结束
	Status int `json:"status"`

	// 考场口播状态，0:未口播 1:正在口播
	AudioStatus int `json:"audioStatus"`

	// 消息组id
	ImGroupId string `json:"imGroupId"`

	// 考场创建者id
	CreateTeacher string `json:"createTeacher"`

	// 创建时间
	CreatedAt time.Time `json:"createdAt" gorm:"index:idx_create_at"`
	// 更新时间
	UpdatedAt time.Time `json:"updatedAt"`
}

// 自动播放的音频
type ExamRadioInfo struct {
	// 名字
	ID string `json:"id"`
	// 分类
	Classify int `json:"classify"`
	// 名字
	Name string `json:"name"`
	// 开始时间
	StartTime time.Time `json:"startTime"`
	// 地址
	Url string `json:"url"`
}

type SelectAudioData struct {
	PageNum           int              `json:"pageNum"`
	PageSize          int              `json:"pageSize"`
	Size              int              `json:"size"`
	StartRow          int              `json:"startRow"`
	EndRow            int              `json:"endRow"`
	Pages             int              `json:"pages"`
	PrePage           int              `json:"prePage"`
	NextPage          int              `json:"nextPage"`
	IsFirstPage       bool             `json:"isFirstPage"`
	IsLastPage        bool             `json:"isLastPage"`
	HasPreviousPage   bool             `json:"hasPreviousPage"`
	HasNextPage       bool             `json:"hasNextPage"`
	NavigatePages     int              `json:"navigatePages"`
	NavigatepageNums  []int            `json:"navigatepageNums"`
	NavigateFirstPage int              `json:"navigateFirstPage"`
	NavigateLastPage  int              `json:"navigateLastPage"`
	Total             int              `json:"total"`
	List              []*ExamAudioInfo `json:"list"`
}

// 需要老师手动播放的音频
type ExamAudioInfo struct {
	// 名字
	ID string `json:"id"`
	// 分类
	Classify int `json:"classify"`
	// 名字
	Name string `json:"name"`
	// 地址
	Url string `json:"url"`
}

// 考试用户信息
type ExamUserInfo struct {
	// 用户id
	ID string `json:"id"`
	// 昵称
	Name string `json:"name"`
	// 状态
	UserStatus int `json:"userStatus"`
	// 推流地址
	RtcPushUrl string `json:"rtcPushUrl"`
	// 大流地址
	RtcPullUrl string `json:"rtcPullUrl"`
	// 小流地址（转码低清晰度的流）
	RtsPullUrl string `json:"rtsPullUrl"`
}

type PushLiveInfo struct {
	RtmpUrl string `json:"rtmp_url"`
	RtsUrl  string `json:"rts_url"`
	SrtUrl  string `json:"srt_url"`
}
type Status struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details"`
}

type AuthTokenRequest struct {
	UserId    string `json:"user_id" binding:"required"`
	LiveId    string `json:"live_id" binding:"required"`
	UserName  string `json:"user_name"`
	AppServer string `json:"app_server"`
	Token     string `json:"token"`
}

type AuthTokenResponse struct {
	LoginToken string `json:"login_token"`
}

type ExamHandlerResp struct {
	// 是否成功
	Success bool `json:"success"`
	// 异常码
	ErrorCode string `json:"errorCode"`
	// 异常信息
	ErrorMsg string `json:"errorMsg"`
	// 数据
	Data interface{} `json:"data"`
}
