package database

import (
	"fmt"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	gormlogger "gorm.io/gorm/logger"

	"github.com/shuangxiupin/server/internal/config"
	"github.com/shuangxiupin/server/internal/model"
)

func OpenMySQL(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Warn),
	})
	if err != nil {
		return nil, err
	}
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(time.Hour)
	return db, nil
}

func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.User{},
		&model.EmailDomain{},
		&model.Company{},
		&model.Job{},
		&model.Post{},
		&model.Comment{},
		&model.Review{},
		&model.Like{},
				&model.Favorite{},model.Favorite{},
		&model.ViewHistory{},
		&model.Follow{},
		&model.Notification{},
		&model.CertRequest{},
		&model.VerificationCode{},
		&model.Permission{},
		&model.Role{},
		&model.RolePermission{},
		&model.UserRole{},
		&model.SystemSetting{},
		&model.Announcement{},
	)
}

// Seed 内置数据：默认系统管理员（首次登录强制改密）+ 注册邮箱域名白名单。
func Seed(db *gorm.DB, cfg *config.Config) error {
	var cnt int64
	if err := db.Model(&model.User{}).Where("email = ?", cfg.Seed.AdminEmail).Count(&cnt).Error; err != nil {
		return err
	}
	if cnt == 0 {
		hash, err := hashPassword(cfg.Seed.AdminPassword)
		if err != nil {
			return err
		}
		admin := &model.User{
			Email:         cfg.Seed.AdminEmail,
			PasswordHash:  hash,
			Nickname:      "系统管理员",
			Role:          model.RoleSysAdmin,
			Status:        model.StatusActive,
			MustChangePWD: true,
			ContactEmail:  cfg.Seed.AdminEmail,
		}
		if err := db.Create(admin).Error; err != nil {
			return fmt.Errorf("创建默认管理员失败: %w", err)
		}
	}

	domains := []string{
		"qq.com", "vip.qq.com", "foxmail.com",
		"163.com", "vip.163.com", "126.com", "yeah.net",
		"sina.com", "sina.cn", "vip.sina.com",
		"sohu.com", "aliyun.com", "139.com", "189.cn", "21cn.com", "tom.com",
	}
	for _, d := range domains {
		err := db.Where(model.EmailDomain{Domain: d}).
			FirstOrCreate(&model.EmailDomain{Domain: d, Enabled: true, Remark: "内置"}).Error
		if err != nil {
			return err
		}
	}
	return seedRBAC(db)
}

// seedRBAC 内置权限点、角色、角色-权限映射，并为存量用户按主角色补 user_roles。
func seedRBAC(db *gorm.DB) error {
	permIDs := map[string]int64{}
	for _, p := range model.BuiltinPermissions() {
		var pm model.Permission
		if err := db.Where("code = ?", p.Code).First(&pm).Error; err != nil {
			// 双进程同时启动时可能撞唯一键，创建失败则回读
			if err := db.Create(&pm).Error; err != nil {
				if e2 := db.Where("code = ?", p.Code).First(&pm).Error; e2 != nil {
					return e2
				}
			}
		}
		permIDs[p.Code] = pm.ID
	}

	roles := []model.Role{
		{Code: model.RoleCodeSys, Name: "系统管理员", Builtin: true, Remark: "仅系统与用户账号管理，内网控制台"},
		{Code: model.RoleCodeOps, Name: "运营管理员", Builtin: true, Remark: "企业认证与内容运营"},
		{Code: model.RoleCodeEnterprise, Name: "企业招聘用户", Builtin: true},
		{Code: model.RoleCodeUser, Name: "普通用户", Builtin: true},
	}
	roleIDs := map[string]int64{}
	for _, r := range roles {
		var rm model.Role
		if err := db.Where("code = ?", r.Code).First(&rm).Error; err != nil {
			if err := db.Create(&rm).Error; err != nil {
				if e2 := db.Where("code = ?", r.Code).First(&rm).Error; e2 != nil {
					return e2
				}
			}
		}
		roleIDs[r.Code] = rm.ID
	}

	for roleCode, permCodes := range model.BuiltinRolePerms() {
		roleID := roleIDs[roleCode]
		for _, code := range permCodes {
			if err := db.Clauses(clause.OnConflict{DoNothing: true}).
				Create(&model.RolePermission{RoleID: roleID, PermissionID: permIDs[code]}).Error; err != nil {
				return err
			}
		}
	}

	var users []model.User
	if err := db.Find(&users).Error; err != nil {
		return err
	}
	for i := range users {
		roleID := roleIDs[model.RoleCodeFromEnum(users[i].Role)]
		if err := db.Clauses(clause.OnConflict{DoNothing: true}).
			Create(&model.UserRole{UserID: users[i].ID, RoleID: roleID}).Error; err != nil {
			return err
		}
	}

	// 保留用户 ID 段：1-10000 预留给系统/管理员创建的账号，自助注册从 10001 开始。
	// MySQL 会忽略低于当前自增值的设置，因此幂等可重复执行。
	if err := db.Exec(fmt.Sprintf("ALTER TABLE users AUTO_INCREMENT = %d", model.SelfRegisterStartID)).Error; err != nil {
		return err
	}

	// 清理已废弃的权限点（如更名/移除），连同角色授权关系
	builtin := model.BuiltinPermissionCodes()
	var stale []int64
	if err := db.Model(&model.Permission{}).Where("code NOT IN ?", builtin).Pluck("id", &stale).Error; err != nil {
		return err
	}
	if len(stale) > 0 {
		if err := db.Where("permission_id IN ?", stale).Delete(&model.RolePermission{}).Error; err != nil {
			return err
		}
		if err := db.Where("id IN ?", stale).Delete(&model.Permission{}).Error; err != nil {
			return err
		}
	}
	return nil
}
