package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	jwt "github.com/appleboy/gin-jwt/v2"
	"github.com/gin-gonic/gin/binding"
	"github.com/go-chi/render"

	"ApsaraLive/pkg/models"
	"ApsaraLive/pkg/service"
)

type ExamHandler struct {
	examApi       service.ExamAPI
	jwtMiddleWare *jwt.GinJWTMiddleware
}

func NewExamHandler(examApi service.ExamAPI, jwtMiddleWare *jwt.GinJWTMiddleware) *ExamHandler {
	return &ExamHandler{
		examApi:       examApi,
		jwtMiddleWare: jwtMiddleWare,
	}
}

type createRoomRequest struct {
	// 考场名称
	Name string `json:"name" binding:"required" example:"考场名称-2024全国本科艺术考试第0001考场"`
}

// createRoom
// @Summary 创建考场
// @Description 创建考场
// @Accept  json
// @Produce  json
// @Param   request      body handler.createRoomRequest true "请求参数"
// @Success 200 {object} models.ExamHandlerResp{data=models.ExamRoomInfo{}}
// @Failure 400 {object} models.ExamHandlerResp	"4xx, 客户端错误"
// @Failure 500 {object} models.ExamHandlerResp	"5xx, 请求失败"
// @Router /createRoom [post]
func (h *ExamHandler) CreateExamRoom(w http.ResponseWriter, r *http.Request) {
	var in createRoomRequest
	b := binding.Default(r.Method, strings.Split(r.Header.Get("Content-Type"), ";")[0])
	err := b.Bind(r, &in)
	var rst *models.ExamHandlerResp
	var data *models.ExamRoomInfo
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusBadRequest), ErrorMsg: err.Error()}
		render.DefaultResponder(w, r, rst)
		return
	}
	data, err = h.examApi.CreateExamRoom(in.Name)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusInternalServerError), ErrorMsg: err.Error()}
		render.DefaultResponder(w, r, rst)
		return
	}
	rst = &models.ExamHandlerResp{Success: true, Data: data}
	render.DefaultResponder(w, r, rst)
}

// roomInfo
// @Summary 获取考场信息
// @Description 获取考场信息
// @Accept  json
// @Produce  json
// @Param roomId query string true "房间 ID" example:"d4eca0c1-b8f8-4f26-8f2d-654069fda660"
// @Success 200 {object} models.ExamHandlerResp{data=models.ExamRoomInfo{}}
// @Failure 400 {object} models.ExamHandlerResp	"4xx, 客户端错误"
// @Failure 500 {object} models.ExamHandlerResp	"5xx, 请求失败"
// @Router /roomInfo [get]
func (h *ExamHandler) RoomInfo(w http.ResponseWriter, r *http.Request) {
	//从URL参数中获取roomId
	roomId := r.URL.Query().Get("roomId")

	var rst *models.ExamHandlerResp
	// 如果roomId为空，返回400错误
	if roomId == "" {
		render.Status(r, http.StatusBadRequest)
		rst := &models.ExamHandlerResp{
			Success:   false,
			ErrorCode: strconv.Itoa(http.StatusBadRequest),
			ErrorMsg:  "参数 roomId不能为空",
		}
		render.DefaultResponder(w, r, rst)
		return
	}

	var data *models.ExamRoomInfo
	var err error
	data, err = h.examApi.RoomInfo(roomId)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusInternalServerError), ErrorMsg: err.Error()}
		render.DefaultResponder(w, r, rst)
		return
	}
	rst = &models.ExamHandlerResp{Success: true, Data: data}
	render.DefaultResponder(w, r, rst)
}

type ExamInfoRequest struct {
	// 考场名称
	ExamId string `json:"examId" binding:"required" example:"718d3bf9-831a-424e-94e1-ce64043a"`
}

// examInfo
// @Summary 获取考试信息
// @Description 获取考试信息
// @Accept  json
// @Produce  json
// @Param examId query string true "考试 ID"
// @Success 200 {object} models.ExamHandlerResp{data=models.Examination{}}
// @Failure 400 {object} models.ExamHandlerResp	"4xx, 客户端错误"
// @Failure 500 {object} models.ExamHandlerResp	"5xx, 请求失败"
// @Router /examInfo [get]
func (h *ExamHandler) ExamInfo(w http.ResponseWriter, r *http.Request) {
	var in ExamInfoRequest
	if r.Method != http.MethodGet {
		render.Status(r, http.StatusBadRequest)
		rst := &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusBadRequest), ErrorMsg: "Only GET method is allowed"}
		render.DefaultResponder(w, r, rst)
		return
	}
	examId := r.URL.Query().Get("examId")
	if examId == "" {
		render.Status(r, http.StatusBadRequest)
		rst := &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusBadRequest), ErrorMsg: "examId parameter is missing"}
		render.DefaultResponder(w, r, rst)
		return
	}
	in.ExamId = examId
	var rst *models.ExamHandlerResp
	var data *models.Examination
	var err error
	data, err = h.examApi.ExamInfo(in.ExamId)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusInternalServerError), ErrorMsg: err.Error()}
		render.DefaultResponder(w, r, rst)
		return
	}
	rst = &models.ExamHandlerResp{Success: true, Data: data}
	render.DefaultResponder(w, r, rst)
}

// userInfo
// @Summary 获取用户信息
// @Description 获取用户信息
// @Accept  json
// @Produce  json
// @Param userId query string true "用户id"
// @Param roomId query string true "考场id"
// @Success 200 {object} models.ExamHandlerResp{data=models.ExamUserInfo{}}
// @Failure 400 {object} models.ExamHandlerResp	"4xx, 客户端错误"
// @Failure 500 {object} models.ExamHandlerResp	"5xx, 请求失败"
// @Router /userInfo [get]
func (h *ExamHandler) UserInfo(w http.ResponseWriter, r *http.Request) {
	values := r.URL.Query()
	userId := values.Get("userId")
	roomId := values.Get("roomId")
	var rst *models.ExamHandlerResp
	if userId == "" || roomId == "" {
		render.Status(r, http.StatusBadRequest)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusBadRequest), ErrorMsg: "userId and roomId parameters are required"}
		render.DefaultResponder(w, r, rst)
		return
	}
	var data *models.ExamUserInfo
	var err error
	data, err = h.examApi.UserInfo(userId, roomId)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusInternalServerError), ErrorMsg: err.Error()}
		render.DefaultResponder(w, r, rst)
		return
	}
	rst = &models.ExamHandlerResp{Success: true, Data: data}
	render.DefaultResponder(w, r, rst)
}

type ExamTokenRequest struct {
	UserId     string `json:"userId" binding:"required" example:"用户id:foo"`
	DeviceId   string `json:"deviceId" binding:"required" example:"设备id：DEVICE-ID"`
	DeviceType string `json:"deviceType" binding:"required" example:"设备类型：android/ios/web/win/mac"`
}

type ExamTokenResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

// getIMToken
// @Summary 获取TOKEN
// @Description 获取token
// @Accept  json
// @Produce  json
// @Param   request      body handler.ExamTokenRequest true  "请求参数"
// @Success 200 {object} handler.ExamTokenResponse	"ok"
// @Failure 400 {object} models.Status	"4xx, 客户端错误"
// @Failure 500 {object} models.Status	"5xx, 请求失败"
// @Router /getIMToken [post]
func (h *ExamHandler) GetExamIMToken(w http.ResponseWriter, r *http.Request) {
	env := r.Header.Get("x-live-env")
	var in ExamTokenRequest
	b := binding.Default(r.Method, strings.Split(r.Header.Get("Content-Type"), ";")[0])
	err := b.Bind(r, &in)
	var rst *models.ExamHandlerResp
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusBadRequest), ErrorMsg: err.Error()}
		render.DefaultResponder(w, r, rst)
		return
	}

	var tokenResp ExamTokenResponse
	tokenResp.AccessToken, err = h.examApi.GetExamIMToken(env, in.UserId, in.DeviceId, in.DeviceType)
	tokenResp.RefreshToken = tokenResp.AccessToken
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusInternalServerError), ErrorMsg: err.Error()}
	}
	rst = &models.ExamHandlerResp{Success: true, Data: tokenResp}
	render.DefaultResponder(w, r, rst)
}

type UserListRequest struct {
	// 考场名称
	RoomID string `json:"roomId" binding:"required" example:"718d3bf9-831a-424e-94e1-ce64043a"`
}

// userList
// @Summary 获取考场的学生列表
// @Description 获取考场的学生列表
// @Accept  json
// @Produce  json
// @Param   request      body handler.UserListRequest true "请求参数"
// @Success 200 {object} models.ExamHandlerResp{data=[]models.ExamUserInfo{}}
// @Failure 400 {object} models.ExamHandlerResp	"4xx, 客户端错误"
// @Failure 500 {object} models.ExamHandlerResp	"5xx, 请求失败"
// @Router /userList [get]
func (h *ExamHandler) UserList(w http.ResponseWriter, r *http.Request) {
	values := r.URL.Query()
	roomID := values.Get("roomId")
	var rst *models.ExamHandlerResp
	if roomID == "" {
		render.Status(r, http.StatusBadRequest)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusBadRequest), ErrorMsg: "roomId parameter is required"}
		render.DefaultResponder(w, r, rst)
		return
	}
	var data []*models.ExamUserInfo
	var err error
	data, err = h.examApi.UserList(roomID)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusInternalServerError), ErrorMsg: err.Error()}
		render.DefaultResponder(w, r, rst)
		return
	}
	rst = &models.ExamHandlerResp{Success: true, Data: data}
	render.DefaultResponder(w, r, rst)
}

// endRoom
// @Summary 结束考场
// @Description 结束考场
// @Accept  json
// @Produce  json
// @Param roomId query string true "房间 ID" example:"d4eca0c1-b8f8-4f26-8f2d-654069fda660"
// @Success 200 {object} models.ExamHandlerResp{data=bool}
// @Failure 400 {object} models.ExamHandlerResp	"4xx, 客户端错误"
// @Failure 500 {object} models.ExamHandlerResp	"5xx, 请求失败"
// @Router /endRoom [get]
func (h *ExamHandler) EndExamRoom(w http.ResponseWriter, r *http.Request) {
	// 将 POST 改为 GET 方法
	if r.Method != http.MethodGet {
		render.Status(r, http.StatusMethodNotAllowed)
		rst := &models.ExamHandlerResp{
			Success:   false,
			ErrorCode: strconv.Itoa(http.StatusMethodNotAllowed),
			ErrorMsg:  "仅支持 GET 方法",
		}
		render.DefaultResponder(w, r, rst)
		return
	}

	//从 URL 参数中获取房间ID
	roomID := r.URL.Query().Get("roomId")

	// 如果房间ID为空，返回400错误
	if roomID == "" {
		render.Status(r, http.StatusBadRequest)
		rst := &models.ExamHandlerResp{
			Success:   false,
			ErrorCode: strconv.Itoa(http.StatusBadRequest),
			ErrorMsg:  "roomId不能为空",
		}
		render.DefaultResponder(w, r, rst)
		return
	}

	data := true
	err := h.examApi.EndRoom(roomID)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		rst := &models.ExamHandlerResp{
			Success:   false,
			ErrorCode: strconv.Itoa(http.StatusInternalServerError),
			ErrorMsg:  err.Error(),
		}
		render.DefaultResponder(w, r, rst)
		return
	}

	rst := &models.ExamHandlerResp{
		Success: true,
		Data:    data,
	}
	render.DefaultResponder(w, r, rst)
}

type UpdateRoomAudioStatusRequest struct {
	// 考场名称
	RoomID string `json:"id" binding:"required" example:"718d3bf9-831a-424e-94e1-ce64043a"`
	// 考场口播状态, 0：未口播,1：正在口播
	AudioStatus *int `json:"audioStatus" binding:"required" example:"1"`
}

// updateRoomAudioStatus
// @Summary 更新考场口播状态
// @Description 更新考场口播状态
// @Accept  json
// @Produce  json
// @Param   request      body handler.UpdateRoomAudioStatusRequest true "请求参数"
// @Success 200 {object} models.ExamHandlerResp{data=bool}
// @Failure 400 {object} models.ExamHandlerResp	"4xx, 客户端错误"
// @Failure 500 {object} models.ExamHandlerResp	"5xx, 请求失败"
// @Router /updateRoomAudioStatus [post]
func (h *ExamHandler) UpdateRoomAudioStatus(w http.ResponseWriter, r *http.Request) {
	var in UpdateRoomAudioStatusRequest
	b := binding.Default(r.Method, strings.Split(r.Header.Get("Content-Type"), ";")[0])
	err := b.Bind(r, &in)
	fmt.Printf("%+v", in)
	var rst *models.ExamHandlerResp
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusBadRequest), ErrorMsg: err.Error()}
		render.DefaultResponder(w, r, rst)
		return
	}
	data := true
	err = h.examApi.UpdateRoomAudioStatus(in.RoomID, *in.AudioStatus)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusInternalServerError), ErrorMsg: err.Error()}
		render.DefaultResponder(w, r, rst)
		return
	}
	rst = &models.ExamHandlerResp{Success: true, Data: data}
	render.DefaultResponder(w, r, rst)
}

type SelectAudioRequest struct {
	// 页面大小
	PageSize int `json:"pageSize" binding:"required" example:"10"`
	// 页数
	PageNum int `json:"pageNum" binding:"required" example:"10"`
	// 名字
	Name string `json:"name" example:"音频名字"`
	// 分类
	Classify int `json:"classify" binding:"required" example:"2"`
}

// selectAudio
// @Summary 查询系统音频列表
// @Description 查询系统音频列表
// @Accept  json
// @Produce  json
// @Param   request      body handler.SelectAudioRequest true "请求参数"
// @Success 200 {object} models.ExamHandlerResp{data=models.SelectAudioData{}}
// @Failure 400 {object} models.ExamHandlerResp	"4xx, 客户端错误"
// @Failure 500 {object} models.ExamHandlerResp	"5xx, 请求失败"
// @Router /selectAudio [post]
func (h *ExamHandler) SelectAudio(w http.ResponseWriter, r *http.Request) {
	var in SelectAudioRequest
	b := binding.Default(r.Method, strings.Split(r.Header.Get("Content-Type"), ";")[0])
	err := b.Bind(r, &in)
	var rst *models.ExamHandlerResp
	var data *models.SelectAudioData
	if err != nil {
		render.Status(r, http.StatusBadRequest)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusBadRequest), ErrorMsg: err.Error()}
		render.DefaultResponder(w, r, rst)
		return
	}
	data, err = h.examApi.SelectAudio(in.PageSize, in.PageNum, in.Name, in.Classify)
	if err != nil {
		render.Status(r, http.StatusInternalServerError)
		rst = &models.ExamHandlerResp{Success: false, ErrorCode: strconv.Itoa(http.StatusInternalServerError), ErrorMsg: err.Error()}
		render.DefaultResponder(w, r, rst)
		return
	}
	rst = &models.ExamHandlerResp{Success: true, Data: data}
	render.DefaultResponder(w, r, rst)
}
