# Region·AMI·Instance Type·DB/S3 입력값 정의

# AWS Region
variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "ap-northeast-2"
}

# 운영 서비스 대표 도메인
variable "service_domain" {
  description = "운영 서비스 도메인"
  type        = string
  default     = "rentversal.site"
}

# 운영 Snapshot에서 확인한 EC2 AMI 이름
variable "ubuntu_ami_name" {
  description = "Main/ML/Passwordless EC2에 사용할 Ubuntu AMI 이름"
  type        = string
  default     = "ubuntu/images/hvm-ssd-gp3/ubuntu-resolute-26.04-amd64-server-20260604"
}

# 운영 Snapshot의 EC2 Instance Type
variable "main_instance_type" {
  type    = string
  default = "t3.micro"
}

variable "ml_instance_type" {
  type    = string
  default = "t3.small"
}

variable "passwordless_instance_type" {
  type    = string
  default = "t3.small"
}

# Main EC2 내부 MySQL Database 이름
variable "mysql_database" {
  type    = string
  default = "rentversal"
}

# 운영 Snapshot의 실제 S3 Bucket 이름
variable "s3_bucket_name" {
  type    = string
  default = "home-rentversal-bucket"
}

# Passwordless auth 도메인의 Lets Encrypt 인증서 발급 알림 이메일
# AWS Snapshot에 저장되는 값이 아니므로 실제 사용할 이메일은 terraform.tfvars에서 입력
variable "letsencrypt_email" {
  description = "Passwordless auth 도메인 Lets Encrypt 인증서 알림 이메일"
  type        = string
}