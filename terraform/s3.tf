# S3 Bucket·IAM User·Access Key 구성

# 운영 Snapshot의 실제 Bucket 이름으로 S3 생성
resource "aws_s3_bucket" "uploads" {
  bucket = var.s3_bucket_name
}

# 운영 Snapshot: Object Ownership = BucketOwnerEnforced
resource "aws_s3_bucket_ownership_controls" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# 운영 Snapshot: AES256 기본 암호화 + Bucket Key + SSE-C 차단
resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    blocked_encryption_types = ["SSE-C"]
    bucket_key_enabled       = true

    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 운영 Snapshot: Bucket 수준 Public Access Block 4개 모두 비활성화
resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls       = false
  ignore_public_acls      = false
  block_public_policy     = false
  restrict_public_buckets = false
}

# 운영 Snapshot: Requester Pays 미사용 → 비용 부담 주체 BucketOwner
resource "aws_s3_bucket_request_payment_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  payer  = "BucketOwner"
}

# 운영 Snapshot의 PublicReadGetObject Bucket Policy
resource "aws_s3_bucket_policy" "public_read" {
  bucket     = aws_s3_bucket.uploads.id
  depends_on = [aws_s3_bucket_public_access_block.uploads]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.uploads.arn}/*"
    }]
  })
}

# 운영 Snapshot의 S3 전용 IAM User
resource "aws_iam_user" "s3_uploader" {
  name = "project-s3-uploader"
}

# 운영 Snapshot의 고객 관리형 IAM Policy
resource "aws_iam_policy" "s3_uploader" {
  name = "project-s3-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "CoffeeBucketAccess"
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"]
      Resource = "${aws_s3_bucket.uploads.arn}/*"
    }]
  })
}

# IAM User에 고객 관리형 Policy 연결
resource "aws_iam_user_policy_attachment" "s3_uploader" {
  user       = aws_iam_user.s3_uploader.name
  policy_arn = aws_iam_policy.s3_uploader.arn
}

# Spring CD S3_ACCESS_KEY / S3_SECRET_KEY용 새 Access Key 생성
# 기존 운영 Access Key 문자열은 동적 보안값이므로 하드코딩하지 않음
resource "aws_iam_access_key" "s3_uploader" {
  user = aws_iam_user.s3_uploader.name
}