'use strict';

var LOG_TYPE = {
    '1': 'FATAL',
    '2': 'WARNING',
    '3': 'ERROR',
    '4': 'NOTICE',
    '8': 'TRACE',
    '16': 'DEBUG'
};
var LOG_TYPE_STYLE = {
    '1': 'color:red;',
    '2': 'color:orange;',
    '3': 'color:red;',
    '4': 'color:#333;',
    '8': 'color:#333;',
    '16': 'color:#333;'
};

var LOG_FIELD = ['type', 'content', 'file', 'line', 'logid', 'time'];

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    var logs;
    try {
        logs = JSON.parse(request);
    } catch (e) {
        console.log('Log parse error, origin log: ' + request);
    }
    for (var i = 0; i < logs.length; i++) {
        var log = {};
        for (var j = logs[i].length - 1; j >= 0; j--) {
            log[LOG_FIELD[j]] = logs[i][j];
        }
        console.group('%c%s %c%s',
            LOG_TYPE_STYLE[log.type], LOG_TYPE[log.type],
            'color: #999;', new Date(log.time * 1000).toLocaleTimeString());
        console.log.call(console, log.content);
        delete log.type;
        delete log.time;
        delete log.content;
        console.log.call(console, '    %cTRACE: %O', 'color: #999;', log);
        console.groupEnd();
    }
    if (sendResponse) {
        sendResponse(true);
    }
});

console.log('Show Me the LOG initialized.');

chrome.extension.sendMessage('ready');
