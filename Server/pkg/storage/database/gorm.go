package database

import (
	"ApsaraLive/pkg/storage"
	"fmt"

	"ApsaraLive/pkg/models"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var _ storage.ExamStorageAPI = (*GormDb)(nil)

type GormDb struct {
	db *gorm.DB
}

func NewGormDb(driver string, dsn string) (*GormDb, error) {
	g := &GormDb{}
	var err error

	if driver == "sqlite3" {
		g.db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	} else {
		g.db, err = gorm.Open(mysql.New(mysql.Config{
			DSN:                       dsn,   // DSN data source name
			DefaultStringSize:         256,   // string 类型字段的默认长度
			DisableDatetimePrecision:  true,  // 禁用 datetime 精度，MySQL 5.6 之前的数据库不支持
			DontSupportRenameIndex:    true,  // 重命名索引时采用删除并新建的方式，MySQL 5.7 之前的数据库和 MariaDB 不支持重命名索引
			DontSupportRenameColumn:   true,  // 用 `change` 重命名列，MySQL 8 之前的数据库和 MariaDB 不支持重命名列
			SkipInitializeWithVersion: false, // 根据当前 MySQL 版本自动配置
		}), &gorm.Config{})
	}

	if err != nil {
		return nil, err
	}

	err = g.db.AutoMigrate(&models.ExamRoomInfo{}, &models.Examination{})
	if err != nil {
		return nil, err
	}

	return g, err
}

func (g *GormDb) CreateExamRoom(r *models.ExamRoomInfo) error {
	rst := g.db.Create(r)
	return rst.Error
}

func (g *GormDb) CreateExam(r *models.Examination) error {
	rst := g.db.Create(r)
	return rst.Error
}

// 获取考场信息
func (g *GormDb) GetExamRoom(roomId string) (*models.ExamRoomInfo, error) {
	var r models.ExamRoomInfo
	rst := g.db.Where("id = ?", roomId).First(&r)
	if rst.Error != nil {
		return &r, fmt.Errorf("get record failed. %w.\n", rst.Error)
	}

	return &r, nil
}

// 获取考试信息
func (g *GormDb) GetExam(examId string) (*models.Examination, error) {
	var r models.Examination
	rst := g.db.Where("id = ?", examId).First(&r)
	if rst.Error != nil {
		return &r, fmt.Errorf("get record failed. %w.\n", rst.Error)
	}

	return &r, nil
}

// 更新考场
func (g *GormDb) UpdateExamRoom(id string, r *models.ExamRoomInfo) error {
	rst := g.db.Where("id = ?", id).Updates(r)

	return rst.Error
}

// UpdateExamRoomStatus 更新考场状态
func (g *GormDb) UpdateExamRoomStatus(id string, r *models.ExamRoomInfo) error {

	rst := g.db.Where("id = ?", id).Model(r).Updates(map[string]interface{}{
		"audio_status": r.AudioStatus,
		"updated_at":   r.UpdatedAt,
		"status":       r.Status,
	})

	return rst.Error
}
