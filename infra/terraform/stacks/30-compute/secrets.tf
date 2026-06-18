# App secrets — created out-of-band in SSM Parameter Store (SecureString).
data "aws_ssm_parameter" "django_secret_key" {
  name            = "${var.ssm_prefix}/DJANGO_SECRET_KEY"
  with_decryption = true
}

data "aws_ssm_parameter" "db_password" {
  name            = "${var.ssm_prefix}/DB_PASSWORD"
  with_decryption = true
}

data "aws_ssm_parameter" "razorpay_key_secret" {
  name            = "${var.ssm_prefix}/RAZORPAY_KEY_SECRET"
  with_decryption = true
}

data "aws_ssm_parameter" "razorpay_webhook_secret" {
  name            = "${var.ssm_prefix}/RAZORPAY_WEBHOOK_SECRET"
  with_decryption = true
}

data "aws_ssm_parameter" "email_host_password" {
  name            = "${var.ssm_prefix}/EMAIL_HOST_PASSWORD"
  with_decryption = true
}
