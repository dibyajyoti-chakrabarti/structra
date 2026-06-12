def handler(event, context):
    expected = event['request']['privateChallengeParameters'].get('otp', '')
    provided = (event['request']['challengeAnswer'] or '').strip()
    event['response']['answerCorrect'] = (provided == expected.strip())
    return event
