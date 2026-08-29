# ALB·Main·ML·Passwordless 접근 규칙 구성

# 운영 Snapshot의 Security Group 이름과 설명을 그대로 재현
resource "aws_security_group" "alb" {
  name        = "HOME-ALB-SG"
  description = "ALB security group"
  vpc_id      = aws_vpc.home.id
  tags        = { Name = "HOME-ALB-SG" }
}

resource "aws_security_group" "main" {
  name        = "HOME-PUBLIC-SG-2A"
  description = "main security group"
  vpc_id      = aws_vpc.home.id
  tags        = { Name = "HOME-PUBLIC-SG-2A" }
}

resource "aws_security_group" "ml" {
  name        = "ML-SG"
  description = "security for Rentversal ML FastAPI"
  vpc_id      = aws_vpc.home.id
  tags        = { Name = "ML-SG" }
}

resource "aws_security_group" "passwordless" {
  name        = "PASSWORDLESS-SG"
  description = "security for Passwordless"
  vpc_id      = aws_vpc.home.id
  tags        = { Name = "PASSWORDLESS-SG" }
}

# Internet -> ALB 80/443
resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
}

# ALB -> Main Nginx 80
resource "aws_vpc_security_group_ingress_rule" "main_http_from_alb" {
  security_group_id            = aws_security_group.main.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 80
  to_port                      = 80
  ip_protocol                  = "tcp"
}

# ML -> Main Spring 9022
resource "aws_vpc_security_group_ingress_rule" "main_spring_from_ml" {
  security_group_id            = aws_security_group.main.id
  referenced_security_group_id = aws_security_group.ml.id
  from_port                    = 9022
  to_port                      = 9022
  ip_protocol                  = "tcp"
}

# 운영 SG와 동일하게 Main/ML SSH를 모든 IPv4에서 허용
resource "aws_vpc_security_group_ingress_rule" "main_ssh" {
  security_group_id = aws_security_group.main.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}

# Main -> ML FastAPI 8000
resource "aws_vpc_security_group_ingress_rule" "ml_fastapi_from_main" {
  security_group_id            = aws_security_group.ml.id
  referenced_security_group_id = aws_security_group.main.id
  from_port                    = 8000
  to_port                      = 8000
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "ml_ssh" {
  security_group_id = aws_security_group.ml.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 22
  to_port           = 22
  ip_protocol       = "tcp"
}

# Passwordless 운영 SG의 공개 포트
locals {
  passwordless_public_ports = {
    ssh             = 22
    http            = 80
    https           = 443
    auth            = 8080
    admin           = 8143
    internal_https  = 8443
    rest_api        = 11040
    user_connection = 12010
    push_socket     = 15010
  }
}

resource "aws_vpc_security_group_ingress_rule" "passwordless_public" {
  for_each = local.passwordless_public_ports

  security_group_id = aws_security_group.passwordless.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = each.value
  to_port           = each.value
  ip_protocol       = "tcp"
}

# 네 SG 모두 운영 Snapshot과 동일하게 모든 IPv4 Egress 허용
resource "aws_vpc_security_group_egress_rule" "all" {
  for_each = {
    alb          = aws_security_group.alb.id
    main         = aws_security_group.main.id
    ml           = aws_security_group.ml.id
    passwordless = aws_security_group.passwordless.id
  }

  security_group_id = each.value
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}