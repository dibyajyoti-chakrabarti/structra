function handler(event) {
    var host = event.request.headers.host.value;
    if (host === 'www.structra.cloud') {
        return {
            statusCode: 301,
            statusDescription: 'Moved Permanently',
            headers: {
                location: { value: 'https://structra.cloud' + event.request.uri }
            }
        };
    }
    return event.request;
}
