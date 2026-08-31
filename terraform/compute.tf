# Main·ML·Passwordless EC2·EIP 구성

# 운영과 동일하게 Main·ML·Passwordless 각각 Elastic IP 사용
resource "aws_eip" "main" {
  domain = "vpc"
  tags   = { Name = "HOME-PUBLIC-EC2-2A" }
}

resource "aws_eip" "ml" {
  domain = "vpc"
  tags   = { Name = "ML-EC2" }
}

resource "aws_eip" "passwordless" {
  domain = "vpc"
  tags   = { Name = "PASSWORDLESS-EC2" }
}

# React·Spring Boot·MySQL이 동작하는 Main EC2
resource "aws_instance" "main" {
  ami                                  = data.aws_ami.ubuntu_2604.id
  instance_type                        = var.main_instance_type
  subnet_id                            = aws_subnet.public_2a.id
  vpc_security_group_ids               = [aws_security_group.main.id]
  key_name                             = aws_key_pair.home.key_name
  associate_public_ip_address          = false
  tenancy                              = "default"
  monitoring                           = false
  ebs_optimized                        = true
  source_dest_check                    = true
  disable_api_termination              = false
  disable_api_stop                     = false
  instance_initiated_shutdown_behavior = "stop"
  hibernation                          = false
  user_data_replace_on_change          = true

  user_data = templatefile("${path.module}/scripts/main-init.sh.tftpl", {
    mysql_database      = var.mysql_database
    mysql_root_password = random_password.mysql_root.result
  })

  credit_specification {
    cpu_credits = "unlimited"
  }
  cpu_options {
    core_count       = 1
    threads_per_core = 2
  }

  # 운영 Snapshot의 EC2 Capacity Reservation / Nitro Enclave / Maintenance 설정
  capacity_reservation_specification {
    capacity_reservation_preference = "open"
  }

  enclave_options {
    enabled = false
  }

  maintenance_options {
    auto_recovery = "default"
  }

  # 운영 Snapshot의 Private DNS Hostname 옵션
  private_dns_name_options {
    hostname_type                        = "ip-name"
    enable_resource_name_dns_a_record    = false
    enable_resource_name_dns_aaaa_record = false
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    http_protocol_ipv6          = "disabled"
    instance_metadata_tags      = "disabled"
  }

  root_block_device {
    volume_size           = 16
    volume_type           = "gp3"
    iops                  = 3000
    throughput            = 125
    encrypted             = false
    delete_on_termination = true
  }

  tags = { Name = "HOME-PUBLIC-EC2-2A" }
}

# FastAPI ML 서비스가 동작하는 ML EC2
resource "aws_instance" "ml" {
  ami                                  = data.aws_ami.ubuntu_2604.id
  instance_type                        = var.ml_instance_type
  subnet_id                            = aws_subnet.public_2a.id
  vpc_security_group_ids               = [aws_security_group.ml.id]
  key_name                             = aws_key_pair.home.key_name
  associate_public_ip_address          = false
  tenancy                              = "default"
  monitoring                           = false
  ebs_optimized                        = true
  source_dest_check                    = true
  disable_api_termination              = false
  disable_api_stop                     = false
  instance_initiated_shutdown_behavior = "stop"
  hibernation                          = false
  user_data_replace_on_change          = true
  user_data                            = templatefile("${path.module}/scripts/ml-init.sh.tftpl", {})

  credit_specification {
    cpu_credits = "unlimited"
  }
  cpu_options {
    core_count       = 1
    threads_per_core = 2
  }

  # 운영 Snapshot의 EC2 Capacity Reservation / Nitro Enclave / Maintenance 설정
  capacity_reservation_specification {
    capacity_reservation_preference = "open"
  }

  enclave_options {
    enabled = false
  }

  maintenance_options {
    auto_recovery = "default"
  }

  # 운영 Snapshot의 Private DNS Hostname 옵션
  private_dns_name_options {
    hostname_type                        = "ip-name"
    enable_resource_name_dns_a_record    = false
    enable_resource_name_dns_aaaa_record = false
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    http_protocol_ipv6          = "disabled"
    instance_metadata_tags      = "disabled"
  }

  root_block_device {
    volume_size           = 16
    volume_type           = "gp3"
    iops                  = 3000
    throughput            = 125
    encrypted             = false
    delete_on_termination = true
  }

  tags = { Name = "ML-EC2" }
}

# Passwordless X1280 인증 서버가 동작하는 EC2
resource "aws_instance" "passwordless" {
  ami                                  = data.aws_ami.ubuntu_2604.id
  instance_type                        = var.passwordless_instance_type
  subnet_id                            = aws_subnet.public_2a.id
  vpc_security_group_ids               = [aws_security_group.passwordless.id]
  key_name                             = aws_key_pair.home.key_name
  associate_public_ip_address          = false
  tenancy                              = "default"
  monitoring                           = false
  ebs_optimized                        = true
  source_dest_check                    = true
  disable_api_termination              = false
  disable_api_stop                     = false
  instance_initiated_shutdown_behavior = "stop"
  hibernation                          = false
  user_data_replace_on_change          = true

  user_data = templatefile("${path.module}/scripts/passwordless-init.sh.tftpl", {
    auth_domain       = local.auth_domain
    expected_eip      = aws_eip.passwordless.public_ip
    letsencrypt_email = var.letsencrypt_email
    keystore_password = random_password.passwordless_keystore.result
  })

  credit_specification {
    cpu_credits = "unlimited"
  }
  cpu_options {
    core_count       = 1
    threads_per_core = 2
  }

  # 운영 Snapshot의 EC2 Capacity Reservation / Nitro Enclave / Maintenance 설정
  capacity_reservation_specification {
    capacity_reservation_preference = "open"
  }

  enclave_options {
    enabled = false
  }

  maintenance_options {
    auto_recovery = "default"
  }

  # 운영 Snapshot의 Private DNS Hostname 옵션
  private_dns_name_options {
    hostname_type                        = "ip-name"
    enable_resource_name_dns_a_record    = false
    enable_resource_name_dns_aaaa_record = false
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    http_protocol_ipv6          = "disabled"
    instance_metadata_tags      = "disabled"
  }

  root_block_device {
    volume_size           = 16
    volume_type           = "gp3"
    iops                  = 3000
    throughput            = 125
    encrypted             = false
    delete_on_termination = true
  }

  tags = { Name = "PASSWORDLESS-EC2" }
}

# AWS가 새로 할당한 동적 EIP를 각 EC2에 Resource Reference로 연결
resource "aws_eip_association" "main" {
  allocation_id = aws_eip.main.id
  instance_id   = aws_instance.main.id
}

resource "aws_eip_association" "ml" {
  allocation_id = aws_eip.ml.id
  instance_id   = aws_instance.ml.id
}

resource "aws_eip_association" "passwordless" {
  allocation_id = aws_eip.passwordless.id
  instance_id   = aws_instance.passwordless.id
}