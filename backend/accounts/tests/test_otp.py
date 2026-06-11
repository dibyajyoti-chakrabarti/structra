"""
Email OTP login is now handled by the Cognito CUSTOM_AUTH Lambda challenge flow
(DefineAuthChallenge, CreateAuthChallenge, VerifyAuthChallengeResponse).
The Django backend no longer owns the OTP lifecycle — tests for that flow
belong in the Lambda function unit tests.
"""
