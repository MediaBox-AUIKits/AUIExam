package _default

import (
	"ApsaraLive/pkg/alicloud/im"
	live2 "ApsaraLive/pkg/alicloud/live"
	"ApsaraLive/pkg/config"
	"ApsaraLive/pkg/models"
	"ApsaraLive/pkg/storage"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

type ExamManager struct {
	sa        storage.ExamStorageAPI
	appConfig *config.AppConfig
	imService *im.LiveIMService
}

func NewExamManager(sa storage.ExamStorageAPI, imSvr *im.LiveIMService, appConfig *config.AppConfig) *ExamManager {
	l := &ExamManager{sa: sa, appConfig: appConfig, imService: imSvr}
	return l
}

func (manager *ExamManager) CreateExamRoom(name string) (*models.ExamRoomInfo, error) {
	var chatId string
	var err error
	// 老师的ID，固定为"teacher1"，真正实现需要传入真实的创建考场老师ID
	chatId, err = manager.imService.CreateMessageGroup("teacher1", nil)
	if err != nil {
		return nil, err
	}

	examId := uuid.New().String()[:36]
	// 演示，创建考试
	exam := &models.Examination{
		// 考试ID
		ID: examId,
		// 考试名称
		Name: "考试演示考场_" + examId,

		// 开始时间,创建即表示开始
		StartTime: time.Now(),

		// 结束时间，创建时间+30分钟
		EndTime: time.Now().Add(30 * time.Minute),

		// 创建时间
		CreatedAt: time.Now(),
		// 更新时间
		UpdatedAt: time.Now(),
	}

	err = manager.sa.CreateExam(exam)
	if err != nil {
		return nil, err
	}

	// 在直播和群组一对一绑定模型里，可以复用chatId，否则不允许这么做
	roomId := chatId
	// 演示，创建考场
	r := &models.ExamRoomInfo{
		// 考场ID
		ID: roomId,
		// 考场名称
		Name: name,
		// 考试ID
		ExamId: examId,
		// 考场状态, 0:进行中 1:已结束
		Status: 0,
		// 考场口播状态，0:未口播 1:正在口播
		AudioStatus: 0,
		// 消息组id
		ImGroupId: chatId,
		// 考场创建者id
		CreateTeacher: "teacher1",
		// 创建时间
		CreatedAt: time.Now(),
		// 更新时间
		UpdatedAt: time.Now(),
	}

	err = manager.sa.CreateExamRoom(r)
	if err != nil {
		return nil, err
	}
	return r, nil
}

// 获取考场信息
func (manager *ExamManager) RoomInfo(roomId string) (*models.ExamRoomInfo, error) {
	var r *models.ExamRoomInfo
	var err error
	r, err = manager.sa.GetExamRoom(roomId)
	if err != nil {
		return nil, err
	}
	return r, err
}

// 生成手动播放音频列表
func (manager *ExamManager) GenAudioInfoList() []*models.ExamAudioInfo {
	audioList := make([]*models.ExamAudioInfo, 3)
	audioList[0] = &models.ExamAudioInfo{
		// ID
		ID: "0001",
		// 分类
		Classify: 2,
		// 名字
		Name: "考前须知",
		// 地址
		Url: "https://ice-pub-media.myalicdn.com/vod-demo/mp3/%E8%80%83%E5%89%8D%E9%A1%BB%E7%9F%A5.mp3",
	}

	audioList[1] = &models.ExamAudioInfo{
		// ID
		ID: "0002",
		// 分类
		Classify: 2,
		// 名字
		Name: "考试结束",
		// 地址
		Url: "https://ice-pub-media.myalicdn.com/vod-demo/mp3/%E8%80%83%E8%AF%95%E7%BB%93%E6%9D%9F.mp3",
	}

	audioList[2] = &models.ExamAudioInfo{
		// ID
		ID: "0003",
		// 分类
		Classify: 2,
		// 名字
		Name: "背景音乐",
		// 地址
		Url: "https://ice-pub-media.myalicdn.com/vod-demo/Funshine.mp3",
	}

	return audioList
}

// 获取考试信息
func (manager *ExamManager) ExamInfo(examId string) (*models.Examination, error) {
	var r *models.Examination
	var err error
	r, err = manager.sa.GetExam(examId)
	if err != nil {
		return nil, err
	}
	r.AudioInfo = manager.GenAudioInfoList()
	r.RadioInfo = [0]int{}
	return r, err
}

// 获取用户信息
func (manager *ExamManager) UserInfo(userId string, roomId string) (*models.ExamUserInfo, error) {
	var userName string
	if strings.HasPrefix(userId, "examinee") {
		// 这是简单的实现，约定学生的id为，examinee1,examinee2,examinee3,examinee4,examinee5
		userName = "学生" + string(userId[8])
	} else {
		// 这是简单的实现，约定老师的id为，teacher1
		userName = "教师" + string(userId[7])
	}

	// 获取考场记录
	var roomInfo *models.ExamRoomInfo
	var err error
	roomInfo, err = manager.sa.GetExamRoom(roomId)
	if err != nil {
		return nil, err
	}

	// 获取拉流地址
	var pullUrl *live2.PullLiveInfo
	pullUrl, err = manager.getPullLiveInfo(roomInfo, userId)
	if err != nil {
		return nil, err
	}

	// 获取推流地址
	var pushUrl *models.PushLiveInfo
	pushUrl, err = manager.getPushLiveInfo(roomInfo, userId)
	if err != nil {
		return nil, err
	}

	r := &models.ExamUserInfo{
		// 用户id
		ID: userId,
		// 昵称
		Name: userName,
		// 状态
		UserStatus: 0,
		// 推流地址
		RtcPushUrl: pushUrl.RtsUrl,
		// 大流地址
		RtcPullUrl: pullUrl.RtsUrl,
		// 小流地址（转码低清晰度的流）,此处用大流代替，真实生产应当配置转码服务，转成240P拉流地址
		RtsPullUrl: pullUrl.RtsUrl,
	}
	return r, nil
}

// 获取考场用户列表
func (manager *ExamManager) UserList(roomId string) ([]*models.ExamUserInfo, error) {
	userList := make([]*models.ExamUserInfo, 5)
	for i := 1; i < 6; i++ {
		userList[i-1], _ = manager.UserInfo("examinee"+strconv.Itoa(i), roomId)
	}
	return userList, nil
}

func (manager *ExamManager) getPushLiveInfo(r *models.ExamRoomInfo, userId string) (*models.PushLiveInfo, error) {
	streamName := r.ExamId + "-" + r.ID + "-" + userId
	liveConfig := manager.appConfig.LiveStreamConfig

	pushUrl := liveConfig.PushUrl
	pushAuthKey := live2.AAuth(fmt.Sprintf("/%s/%s", liveConfig.AppName, streamName), liveConfig.PushAuthKey, liveConfig.AuthExpires)

	url := fmt.Sprintf("%s/%s/%s?auth_key=%s", pushUrl, liveConfig.AppName, streamName, pushAuthKey)
	return &models.PushLiveInfo{
		RtmpUrl: fmt.Sprintf("%s://%s", "rtmp", url),
		RtsUrl:  fmt.Sprintf("%s://%s", "artc", url),
		SrtUrl:  fmt.Sprintf("%s://%s", "srt", url),
	}, nil
}

/*
文档见：https://help.aliyun.com/document_detail/199339.html
RTMP 格式: rtmp://wgtest.pull.mcsun.cn/AppName/StreamName?auth_key={鉴权串}
FLV 格式: http://wgtest.pull.mcsun.cn/AppName/StreamName.flv?auth_key={鉴权串}
M3U8 格式: http://wgtest.pull.mcsun.cn/AppName/StreamName.m3u8?auth_key={鉴权串}
UDP 格式: artc://wgtest.pull.mcsun.cn/AppName/StreamName?auth_key={鉴权串}
*/
func (manager *ExamManager) getPullLiveInfo(r *models.ExamRoomInfo, userId string) (*live2.PullLiveInfo, error) {
	streamName := r.ExamId + "-" + r.ID + "-" + userId
	liveConfig := manager.appConfig.LiveStreamConfig

	return live2.AuthUrl(liveConfig.Scheme, liveConfig.PullUrl, liveConfig.AppName, streamName, liveConfig.PullAuthKey, liveConfig.AuthExpires), nil
}

func (manager *ExamManager) GetExamIMToken(env, userId, deviceId, deviceType string) (string, error) {
	token, err := manager.imService.GetToken(userId, deviceId, deviceType)
	if err != nil {
		return "", err
	}

	if manager.appConfig.GatewayConfig.Enable {
		return manager.getStagingToken(deviceType, token)
	}
	return token, nil

}

func (manager *ExamManager) getStagingToken(deviceType, token string) (string, error) {
	type PackClaims struct {
		Endpoints []string `json:"endpoints"`
		Token     string   `json:"token"`
	}
	var packClaims PackClaims
	tokenBytes, err := base64.URLEncoding.DecodeString(token)
	if err != nil {
		return "", fmt.Errorf("base64 decode failed. %w", err)
	}
	err = json.Unmarshal(tokenBytes, &packClaims)
	if err != nil {
		return "", fmt.Errorf("json.Unmarshal failed. %w", err)
	}

	if deviceType == "web" {
		packClaims.Endpoints = []string{manager.appConfig.GatewayConfig.WsAddr}
	} else {
		packClaims.Endpoints = []string{manager.appConfig.GatewayConfig.LwpAddr}
	}
	tokenBytes, err = json.Marshal(packClaims)
	if err != nil {
		return "", fmt.Errorf("json.Marshal failed: %w", err)
	}

	return base64.URLEncoding.EncodeToString(tokenBytes), nil
}

// 结束考场
func (manager *ExamManager) EndRoom(roomId string) error {
	// 获取考场记录
	var r *models.ExamRoomInfo
	var err error
	r, err = manager.sa.GetExamRoom(roomId)
	if err != nil {
		return err
	}

	// 修改考场记录更新时间
	r.UpdatedAt = time.Now()
	// 修改考场状态为“已结束”
	r.Status = 1
	// 修改考场口播状态为“未口播”
	r.AudioStatus = 0

	err = manager.sa.UpdateExamRoomStatus(roomId, r)
	if err != nil {
		return err
	}
	return nil
}

// 更新口播状态
func (manager *ExamManager) UpdateRoomAudioStatus(id string, audioStatus int) error {
	// 获取考场记录
	var r *models.ExamRoomInfo
	var err error
	r, err = manager.sa.GetExamRoom(id)
	if err != nil {
		return err
	}

	// 修改考场记录更新时间
	r.UpdatedAt = time.Now()
	// 修改考场口播状态
	r.AudioStatus = audioStatus

	err = manager.sa.UpdateExamRoomStatus(id, r)
	if err != nil {
		return err
	}
	return nil
}

// 查询系统音频列表，此处实现并未实际根据输入参数查询数据库返回音频列表，作为一种示范，hardcode了返回列表
func (manager *ExamManager) SelectAudio(pageSize int, pageNum int, name string, classify int) (*models.SelectAudioData, error) {
	var r *models.SelectAudioData
	r = &models.SelectAudioData{
		PageNum:  1,
		PageSize: 10,
		Total:    3,
		List:     manager.GenAudioInfoList(),
	}

	return r, nil
}
