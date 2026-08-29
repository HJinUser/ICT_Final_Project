# CI/CD 연결용 IP·DB·S3 결과값 정의

# 서비스 접속 주소
output "service_url" {
  value = "https://${local.service_domain}"
}

# 새 Hosted Zone에서 AWS가 동적으로 발급한 Name Server
output "route53_name_servers" {
  value = aws_route53_zone.main.name_servers
}

# ALB가 AWS에서 동적으로 발급받은 DNS Name
output "alb_dns_name" {
  value = aws_lb.home.dns_name
}

# GitHub Actions CD SSH 대상 EIP
output "main_ec2_public_ip" {
  value = aws_eip.main.public_ip
}

output "ml_ec2_public_ip" {
  value = aws_eip.ml.public_ip
}

# Main <-> ML 통신에 사용할 AWS 자동 할당 Private IP
output "main_ec2_private_ip" {
  value = aws_instance.main.private_ip
}

output "ml_ec2_private_ip" {
  value = aws_instance.ml.private_ip
}

# Passwordless auth 도메인이 가리킬 EIP
output "passwordless_eip" {
  value = aws_eip.passwordless.public_ip
}

# Spring Boot DB 환경변수
output "db_url" {
  value = "jdbc:mysql://localhost:3306/${var.mysql_database}?serverTimezone=Asia/Seoul&characterEncoding=UTF-8&useUnicode=true"
}

output "db_username" {
  value = "root"
}

output "db_password" {
  value     = random_password.mysql_root.result
  sensitive = true
}

# Spring Boot S3 환경변수
output "s3_bucket" {
  value = aws_s3_bucket.uploads.bucket
}

output "s3_region" {
  value = var.aws_region
}

output "s3_access_key" {
  value     = aws_iam_access_key.s3_uploader.id
  sensitive = true
}

output "s3_secret_key" {
  value     = aws_iam_access_key.s3_uploader.secret
  sensitive = true
}

# Spring Boot가 호출할 Passwordless REST API 기본 주소
output "passwordless_auth_server_url" {
  value = "http://${local.auth_domain}:11040"
}

# GitHub Actions EC2_KEY Secret에 사용할 새 Private Key
output "ec2_private_key" {
  value     = tls_private_key.ec2.private_key_pem
  sensitive = true
}