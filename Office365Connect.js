var AuthenticationContext = require('adal-node').AuthenticationContext;
var request = require('request');
var O365Constants = require('./O365Constants.js');


module.exports = {
    acquireToken: function (callback) {
        var context = new AuthenticationContext(O365Constants.authorityUrl);
        context.acquireTokenWithClientCredentials(O365Constants.resource, O365Constants.clientId, O365Constants.clientSecret,
            function (err, tokenResponse) {
                if (err) {
                    return null;
                } else {                  
                    callback(tokenResponse.accessToken);
                }
            });
    },
    bookMeeting: function (name, date, time, callback) {
        this.acquireToken(function (token) {
            bookMeeting(token, name, date, time, callback);
        });
    }
}
function bookMeeting(token, name, date, callback) {
    var start = new Date(date);
    var end = new Date(start.getTime() + 60 * 60000);
    console.log(start);
    request(
        {
            url: O365Constants.bookMeetingUrl,
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: {
                'body': {
                    'contentType': 'text',
                    'content': 'Meeting with ' + name
                },
                'reminderMinutesBeforeStart': 1024,
                'responseRequested': true,
                'showAs': 'Busy',
                'start': {
                    'datetime': start,
                    'timezone': 'Australia/Sydney'
                },
                'end': {
                    'datetime': end,
                    'timezone': 'Australia/Sydney'
                },
                'subject': 'Booked Using Office Assistant Bot'
            },
            json: true
        })
        .on('error', function (err) {
            callback(err);
        })
        .on('response', function (response) {
            callback(response);
        });
}