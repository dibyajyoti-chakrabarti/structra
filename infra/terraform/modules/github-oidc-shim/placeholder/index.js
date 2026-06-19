// Placeholder ONLY. The real Lambda code is the github-cognito-openid-wrapper
// bundle that is already deployed and IMPORTED into Terraform state. The
// aws_lambda_function resources ignore_changes on the code, so this file is
// never packaged or deployed — it exists only to satisfy the create-time code
// argument. The live bundle embeds the RSA signing key and has no source repo,
// which is why the code is left unmanaged rather than committed here.
exports.handler = async () => ({ statusCode: 501, body: "unmanaged placeholder" });
