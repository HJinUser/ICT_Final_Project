# AWS Provider·운영 Ubuntu AMI 조회

# 실제 AWS 리소스를 관리할 기본 Provider 설정
provider "aws" {
  region = var.aws_region
}

# 운영 Snapshot에서 확인한 Ubuntu 26.04 AMI와 동일한 이미지 조회
# AMI ID 자체는 계정/시점에 따라 다룰 수 있는 식별자이므로 이름·소유자·아키텍처로 조회
# 현재 운영 이미지: ubuntu-resolute-26.04-amd64-server-20260604
data "aws_ami" "ubuntu_2604" {
  most_recent = false
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = [var.ubuntu_ami_name]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}