# DB master password — created out-of-band in SSM Parameter Store (SecureString).
data "aws_ssm_parameter" "db_password" {
  name            = var.ssm_db_password_name
  with_decryption = true
}
