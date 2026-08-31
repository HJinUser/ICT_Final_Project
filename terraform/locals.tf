# 파생 도메인·동적 Password 생성

locals {
  # 대표 도메인에서 실제 운영 중인 www/auth 도메인 생성
  service_domain = var.service_domain
  www_domain     = "www.${var.service_domain}"
  auth_domain    = "auth.${var.service_domain}"
}

# Main EC2 MySQL root Password 자동 생성
# Password 문자열은 기존 운영값을 복사하지 않고 새 인프라 생성 시 새로 생성
resource "random_password" "mysql_root" {
  length  = 24
  special = false
}

# Passwordless HTTPS Keystore Password 자동 생성
resource "random_password" "passwordless_keystore" {
  length  = 24
  special = false
}