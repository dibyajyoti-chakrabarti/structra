def handler(event, context):
    session = event['request'].get('session', [])
    if session:
        last = session[-1]
        if last['challengeName'] == 'CUSTOM_CHALLENGE' and last['challengeResult']:
            event['response']['issueTokens'] = True
            event['response']['failAuthentication'] = False
            return event
        if len(session) >= 3:
            event['response']['issueTokens'] = False
            event['response']['failAuthentication'] = True
            return event
    event['response']['issueTokens'] = False
    event['response']['failAuthentication'] = False
    event['response']['challengeName'] = 'CUSTOM_CHALLENGE'
    return event
