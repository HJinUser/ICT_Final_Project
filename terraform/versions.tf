# Terraform·Provider 버전 정의

# Terraform 본체와 Provider 버전 범위 고정
# S3 SSE-C 차단 설정을 안정적으로 코드화하기 위해 AWS Provider 6.40 이상 사용
terraform {
  required_version = ">= 1.13.0, < 2.0.0"

  required_providers {
    # VPC·EC2·ALB·Route 53·S3·IAM 등 AWS 리소스 관리
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.40.0, < 7.0.0"
    }

    # MySQL·Passwordless Keystore Password 자동 생성
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }

    # EC2 SSH용 RSA Private/Public Key 생성
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }

    # 생성한 Private Key를 로컬 PEM 파일로 저장
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}