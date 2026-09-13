// Package mailer 轻量 SMTP 邮件发送：465 隐式 SSL / 587 STARTTLS 自适应。
package mailer

import (
	"crypto/tls"
	"fmt"
	"log/slog"
	"mime"
	"net"
	"net/smtp"
	"strings"

	"github.com/shuangxiupin/server/internal/config"
)

// SettingsProvider 动态邮件配置来源（由 SettingsService 实现，管理端改配置即时生效）。
type SettingsProvider interface {
	MailSettings() config.Mail
}

type Mailer struct {
	provider SettingsProvider
}

func NewFromProvider(p SettingsProvider) *Mailer { return &Mailer{provider: p} }

func (m *Mailer) Send(to, subject, htmlBody string) error {
	cfg := m.provider.MailSettings()
	if !cfg.Enabled {
		slog.Info("[mailer] 未启用，仅记录邮件", "to", to, "subject", subject, "body", htmlBody)
		return nil
	}
	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	from := cfg.From
	if from == "" {
		from = cfg.Username
	}
	var msg strings.Builder
	msg.WriteString("From: " + from + "\r\n")
	msg.WriteString("To: " + to + "\r\n")
	msg.WriteString("Subject: " + mime.QEncoding.Encode("UTF-8", subject) + "\r\n")
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(htmlBody)

	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return err
	}
	var auth smtp.Auth
	if cfg.Username != "" {
		auth = smtp.PlainAuth("", cfg.Username, cfg.Password, host)
	}

	if cfg.SSL {
		conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: host})
		if err != nil {
			return fmt.Errorf("连接邮件服务器失败: %w", err)
		}
		cl, err := smtp.NewClient(conn, host)
		if err != nil {
			return err
		}
		defer cl.Close()
		if auth != nil {
			if ok, _ := cl.Extension("AUTH"); ok {
				if err := cl.Auth(auth); err != nil {
					return fmt.Errorf("邮件认证失败: %w", err)
				}
			}
		}
		if err := cl.Mail(from); err != nil {
			return err
		}
		if err := cl.Rcpt(to); err != nil {
			return err
		}
		w, err := cl.Data()
		if err != nil {
			return err
		}
		if _, err := w.Write([]byte(msg.String())); err != nil {
			return err
		}
		if err := w.Close(); err != nil {
			return err
		}
		return cl.Quit()
	}
	// STARTTLS（SendMail 在服务端支持时自动升级 TLS）
	return smtp.SendMail(addr, auth, from, []string{to}, []byte(msg.String()))
}
