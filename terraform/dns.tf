# Route 53 Record·ACM DNS 인증 구성

# 운영과 동일한 rentversal.site Public Hosted Zone 생성
# NS/SOA 값은 Hosted Zone 생성 시 AWS가 새로 발급하므로 하드코딩하지 않음
resource "aws_route53_zone" "main" {
  name    = var.service_domain
  comment = ""
}

# 운영 Snapshot: rentversal.site + *.rentversal.site / DNS 검증 / RSA 2048
resource "aws_acm_certificate" "main" {
  domain_name               = local.service_domain
  validation_method         = "DNS"
  key_algorithm             = "RSA_2048"
  subject_alternative_names = ["*.${local.service_domain}"]

  options {
    certificate_transparency_logging_preference = "ENABLED"
    export                                      = "DISABLED"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ACM이 새 인증서에 대해 생성한 동적 DNS 검증값을 Route 53에 연결
# Root와 Wildcard가 같은 검증 레코드를 공유하므로 레코드 이름을 Key로 중복 제거
resource "aws_route53_record" "acm_validation" {
  for_each = {
    for option in aws_acm_certificate.main.domain_validation_options :
    option.resource_record_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 300
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn = aws_acm_certificate.main.arn
  validation_record_fqdns = [
    for record in aws_route53_record.acm_validation : record.fqdn
  ]
}

# auth.rentversal.site -> Terraform이 새로 생성한 Passwordless EIP
resource "aws_route53_record" "auth" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.auth_domain
  type    = "A"
  ttl     = 300
  records = [aws_eip.passwordless.public_ip]
}