// Extra S3 origins in this module serve pre-built static sites (e.g.
// Docusaurus), which write folder/index.html rather than routing client-side
// like the SPA on the default behavior. Resolve extensionless URIs to their
// index.html so /documentation and /documentation/getting-started both hit
// the right S3 key.
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    } else if (!uri.includes('.')) {
        request.uri += '/index.html';
    }
    return request;
}
