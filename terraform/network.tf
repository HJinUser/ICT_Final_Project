# VPC·Subnet·IGW·Route Table 구성

# 전세역전 서비스 전체 네트워크가 들어갈 VPC
resource "aws_vpc" "home" {
  cidr_block                           = "10.250.0.0/16"
  instance_tenancy                     = "default"
  enable_dns_support                   = true
  enable_dns_hostnames                 = false
  enable_network_address_usage_metrics = false
  assign_generated_ipv6_cidr_block     = false

  tags = {
    Name = "HOME-VPC"
  }
}

# 운영 VPC의 기본 Network ACL과 동일하게 모든 IPv4 Ingress/Egress 허용
resource "aws_default_network_acl" "home" {
  default_network_acl_id = aws_vpc.home.default_network_acl_id
  subnet_ids = [
    aws_subnet.public_2a.id,
    aws_subnet.public_2c.id
  ]

  ingress {
    protocol   = -1
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  egress {
    protocol   = -1
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }
}

# VPC에 Internet Gateway 연결
resource "aws_internet_gateway" "home" {
  vpc_id = aws_vpc.home.id

  tags = {
    Name = "HOME-IGW"
  }
}

# Main·ML·Passwordless와 ALB가 사용하는 2A Public Subnet
resource "aws_subnet" "public_2a" {
  vpc_id            = aws_vpc.home.id
  cidr_block        = "10.250.1.0/24"
  availability_zone = "ap-northeast-2a"

  # 운영 Snapshot에서 Public IPv4 자동 할당 비활성 상태
  map_public_ip_on_launch = false

  # 운영 Snapshot의 IPv6/DNS 관련 Subnet 설정
  assign_ipv6_address_on_creation                = false
  ipv6_native                                    = false
  enable_dns64                                   = false
  private_dns_hostname_type_on_launch            = "ip-name"
  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false

  tags = {
    Name = "HOME-PUBLIC-SBN-2A"
  }
}

# ALB Multi-AZ 구성을 위한 2C Public Subnet
resource "aws_subnet" "public_2c" {
  vpc_id            = aws_vpc.home.id
  cidr_block        = "10.250.2.0/24"
  availability_zone = "ap-northeast-2c"

  # 운영 Snapshot에서 Public IPv4 자동 할당 비활성 상태
  map_public_ip_on_launch = false

  # 운영 Snapshot의 IPv6/DNS 관련 Subnet 설정
  assign_ipv6_address_on_creation                = false
  ipv6_native                                    = false
  enable_dns64                                   = false
  private_dns_hostname_type_on_launch            = "ip-name"
  enable_resource_name_dns_a_record_on_launch    = false
  enable_resource_name_dns_aaaa_record_on_launch = false

  tags = {
    Name = "HOME-PUBLIC-SBN-2C"
  }
}

# 두 Public Subnet에서 외부 Internet으로 나가는 기본 경로 정의
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.home.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.home.id
  }

  tags = {
    Name = "HOME-PUBLIC-RT"
  }
}

# 2A Subnet에 HOME-PUBLIC-RT 연결
resource "aws_route_table_association" "public_2a" {
  subnet_id      = aws_subnet.public_2a.id
  route_table_id = aws_route_table.public.id
}

# 2C Subnet에도 HOME-PUBLIC-RT 연결
resource "aws_route_table_association" "public_2c" {
  subnet_id      = aws_subnet.public_2c.id
  route_table_id = aws_route_table.public.id
}