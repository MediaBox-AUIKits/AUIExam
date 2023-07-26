package storage

import "ApsaraLive/pkg/models"

type ExamStorageAPI interface {
	// 创建考场
	CreateExamRoom(r *models.ExamRoomInfo) error

	// 创建考试
	CreateExam(r *models.Examination) error

	// 获取考场信息
	GetExamRoom(roomId string) (*models.ExamRoomInfo, error)

	// 获取考试信息
	GetExam(examId string) (*models.Examination, error)

	// 更新考场
	UpdateExamRoom(id string, r *models.ExamRoomInfo) error

	UpdateExamRoomStatus(id string, r *models.ExamRoomInfo) error
}
