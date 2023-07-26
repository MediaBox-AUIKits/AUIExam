package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"ApsaraLive/docs"
	"ApsaraLive/internal/auth"
	"ApsaraLive/pkg/alicloud/im"
	"ApsaraLive/pkg/config"
	"ApsaraLive/pkg/handler"
	_default "ApsaraLive/pkg/service/default"
	"ApsaraLive/pkg/storage"
	"ApsaraLive/pkg/storage/database"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

const (
	XHeaderAk       = "x-fc-access-key-id"
	XHeaderSk       = "x-fc-access-key-secret"
	XHeaderStsToken = "x-fc-security-token"

	EnvPasswordName = "ADMIN_PASSWORD"
	SwaggerUserName = "admin"
)

func main() {
	docs.SwaggerInfo.Title = "Swagger Example API"
	docs.SwaggerInfo.Description = "This is a sample server."
	docs.SwaggerInfo.Version = "1.0"
	docs.SwaggerInfo.Host = "example.com"
	docs.SwaggerInfo.BasePath = "/exam"
	docs.SwaggerInfo.Schemes = []string{"http", "https"}

	runServer()
}

func runServer() {
	appConfig, err := config.LoadConfig()
	if err != nil {
		panic(err)
	}

	r := gin.Default()

	// 允许Web sdk跨域接入
	cs := cors.DefaultConfig()
	cs.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization", "x-live-env"}
	cs.AllowOrigins = []string{"*"}
	r.Use(cors.New(cs))

	imService, err := im.NewLiveIMService(appConfig)

	r.GET("/", func(c *gin.Context) {
		url := fmt.Sprintf("请在客户端配置访问访问地址：%s", c.Request.Host+c.Request.URL.Path)
		c.String(http.StatusOK, url)
	})

	authMiddleware, err := auth.GetGinJWTMiddleware()
	if err != nil {
		panic(err)
	}

	err = authMiddleware.MiddlewareInit()
	if err != nil {
		panic(err)
	}
	// just for test
	authMiddleware.Timeout = time.Hour * 24

	// 客户应用自身用户账号管理，以下为模拟，请修改为实际能力
	r.POST("/login", authMiddleware.LoginHandler)
	r.POST("/exam/login", authMiddleware.LoginHandler)
	r.POST("/exam/refresh_token", authMiddleware.RefreshHandler)

	auth := r.Group("/auth")
	auth.GET("/refresh_token", authMiddleware.RefreshHandler)

	var esapi storage.ExamStorageAPI
	{
		esapi, err = database.NewGormDb(appConfig.StorageConfig.Type, appConfig.StorageConfig.Url)
		if err != nil {
			panic(err)
		}
		log.Printf("User %s as storage service...", appConfig.StorageConfig.Type)
	}
	examApi := _default.NewExamManager(esapi, imService, appConfig)
	examHandler := handler.NewExamHandler(examApi, authMiddleware)

	// 对接考试场景的Restful API
	v1 := r.Group("/")
	{
		// 演示开启token拦截，实际生产使用请保证开启
		//v1.Use(authMiddleware.MiddlewareFunc())
		exam := v1.Group("/exam")

		// 如果是在FC环境，自动更新sts token
		exam.Use(func() gin.HandlerFunc {
			return func(ctx *gin.Context) {
				header := ctx.Request.Header
				if header.Get(XHeaderAk) != "" {
					appConfig.OpenAPIConfig.RefreshToken(header.Get(XHeaderAk),
						header.Get(XHeaderSk),
						header.Get(XHeaderStsToken),
					)
				}
				ctx.Next()
			}
		}())
		{
			exam.POST("/createRoom", gin.WrapF(examHandler.CreateExamRoom))
			exam.POST("/getIMToken", gin.WrapF(examHandler.GetExamIMToken))
			exam.POST("/updateRoomAudioStatus", gin.WrapF(examHandler.UpdateRoomAudioStatus))
			exam.POST("/selectAudio", gin.WrapF(examHandler.SelectAudio))

			exam.GET("/roomInfo", gin.WrapF(examHandler.RoomInfo))
			exam.GET("/examInfo", gin.WrapF(examHandler.ExamInfo))
			exam.GET("/userInfo", gin.WrapF(examHandler.UserInfo))
			exam.GET("/userList", gin.WrapF(examHandler.UserList))
			exam.GET("/endRoom", gin.WrapF(examHandler.EndExamRoom))
		}
	}

	// Swagger功能
	password := os.Getenv(EnvPasswordName)
	// 如果密码为空，则关闭swagger的功能
	if password != "" && password != "null" {
		sw := r.Group("/swagger")
		sw.Use(func() gin.HandlerFunc {
			return func(c *gin.Context) {
				docs.SwaggerInfo.Host = c.Request.Host
				c.Next()
			}
		}())
		sw.Use(gin.BasicAuth(gin.Accounts{SwaggerUserName: password}))
		sw.GET("/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	err = r.Run(":7001")
	if err != nil {
		log.Panicln(err)
	}
}
