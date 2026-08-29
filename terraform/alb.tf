# ALB·Target Group·HTTP/HTTPS Listener 구성

# 운영 Snapshot의 Internet-facing IPv4 Application Load Balancer
resource "aws_lb" "home" {
  name               = "HOME-ALB"
  internal           = false
  load_balancer_type = "application"
  ip_address_type    = "ipv4"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_2a.id, aws_subnet.public_2c.id]

  # 운영 ALB Attribute 값
  idle_timeout                                = 60
  client_keep_alive                           = 3600
  enable_deletion_protection                  = false
  enable_http2                                = true
  drop_invalid_header_fields                  = false
  enable_xff_client_port                      = false
  preserve_host_header                        = false
  xff_header_processing_mode                  = "append"
  desync_mitigation_mode                      = "defensive"
  enable_waf_fail_open                        = false
  enable_tls_version_and_cipher_suite_headers = false
  enable_zonal_shift                          = false
  enable_cross_zone_load_balancing            = true
}

# 운영 Snapshot의 HOME-ALB-TG
resource "aws_lb_target_group" "home" {
  name             = "HOME-ALB-TG"
  port             = 80
  protocol         = "HTTP"
  protocol_version = "HTTP1"
  target_type      = "instance"
  vpc_id           = aws_vpc.home.id

  deregistration_delay          = 300
  slow_start                    = 0
  load_balancing_algorithm_type = "round_robin"
  # Snapshot의 anomaly_mitigation=off는 round_robin의 기본 상태이므로 별도 Argument 미지정
  load_balancing_cross_zone_enabled = "use_load_balancer_configuration"

  stickiness {
    type            = "lb_cookie"
    enabled         = false
    cookie_duration = 86400
  }

  target_group_health {
    dns_failover {
      minimum_healthy_targets_count      = "1"
      minimum_healthy_targets_percentage = "off"
    }
    unhealthy_state_routing {
      minimum_healthy_targets_count      = "1"
      minimum_healthy_targets_percentage = "off"
    }
  }

  health_check {
    enabled             = true
    protocol            = "HTTP"
    port                = "traffic-port"
    path                = "/"
    matcher             = "200"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 5
    unhealthy_threshold = 2
  }
}

resource "aws_lb_target_group_attachment" "main" {
  target_group_arn = aws_lb_target_group.home.arn
  target_id        = aws_instance.main.id
  port             = 80
}

# HTTP :80 -> HTTPS :443 / HTTP_301
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.home.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      host        = "#{host}"
      path        = "/#{path}"
      query       = "#{query}"
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS :443 -> HOME-ALB-TG
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.home.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  # Mutual TLS는 운영 Snapshot과 동일하게 미사용(mode off)
  # Provider/AWS 기본값이 off이므로 별도 Trust Store Block 미정의
  default_action {
    type = "forward"

    forward {
      target_group {
        arn    = aws_lb_target_group.home.arn
        weight = 1
      }
      stickiness {
        enabled  = false
        duration = 3600
      }
    }
  }
}

# rentversal.site -> ALB Alias
resource "aws_route53_record" "root" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.service_domain
  type    = "A"

  alias {
    name                   = aws_lb.home.dns_name
    zone_id                = aws_lb.home.zone_id
    evaluate_target_health = true
  }
}

# www.rentversal.site -> 동일 ALB Alias
resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.www_domain
  type    = "A"

  alias {
    name                   = aws_lb.home.dns_name
    zone_id                = aws_lb.home.zone_id
    evaluate_target_health = true
  }
}