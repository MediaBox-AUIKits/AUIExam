package service

import (
	"ApsaraLive/pkg/models"
)

type ExamAPI interface {
	// 创建考场
	CreateExamRoom(name string) (*models.ExamRoomInfo, error)

	// 获取考场信息
	RoomInfo(roomId string) (*models.ExamRoomInfo, error)

	// 获取考试信息
	ExamInfo(examId string) (*models.Examination, error)

	// 获取用户信息
	UserInfo(userId string, roomId string) (*models.ExamUserInfo, error)

	// 获取考试IM token
	GetExamIMToken(env, userId, deviceId, deviceType string) (string, error)

	// 获取考场用户列表
	UserList(roomId string) ([]*models.ExamUserInfo, error)

	// 结束考场
	EndRoom(roomId string) error

	// 更新口播状态
	UpdateRoomAudioStatus(id string, audioStatus int) error

	// 查询系统音频列表
	SelectAudio(pageSize int, pageNum int, name string, classify int) (*models.SelectAudioData, error)
}
