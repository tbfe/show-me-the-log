'use strict';

filter = {
    urls: ['*://*.baidu.com:*/*']
};

chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
    //console.log('req: ', details);
    details.requestHeaders.push({
        'name': 'X-Bingo-Dump-Log',
        'value': '1'
    });
    return {
        requestHeaders: details.requestHeaders
    };
}, filter, ['blocking', 'requestHeaders']);

chrome.webRequest.onHeadersReceived.addListener(function(details) {
    //console.log('res: ', details);
    for (var i = 0; i < details.responseHeaders.length; ++i) {
        if (details.responseHeaders[i].name === 'Content-Type') {
            console.log(details.responseHeaders[i]);
            break;
        }
    }
}, filter, ['responseHeaders']);
