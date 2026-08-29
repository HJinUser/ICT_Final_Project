# EC2 SSH Key Pair 생성

# 운영 Snapshot에서 KeyType=rsa 확인
# 기존 Private Key 원문과 Bit 길이는 AWS Snapshot으로 조회할 수 없으므로 새 키는 표준 RSA 2048bit로 생성
# 기존 Private Key 자체는 동적 보안값이므로 하드코딩하지 않음
resource "tls_private_key" "ec2" {
  algorithm = "RSA"
  rsa_bits  = 2048
}

# 운영과 동일한 Key Pair 이름 사용
resource "aws_key_pair" "home" {
  key_name   = "home-keypair"
  public_key = tls_private_key.ec2.public_key_openssh
}

# GitHub Actions EC2_KEY Secret으로 사용할 Private Key를 로컬 PEM으로 저장
# PEM은 terraform/.gitignore의 *.pem 규칙으로 Git 제외
resource "local_sensitive_file" "ec2_private_key" {
  content         = tls_private_key.ec2.private_key_pem
  filename        = "${path.module}/home-keypair.pem"
  file_permission = "0600"
}