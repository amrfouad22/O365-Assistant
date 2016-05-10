var AuthenticationContext = require('adal-node').AuthenticationContext;
var request = require('request');
var O365Constants = require('./O365Constants.js');
var NodeCache = require("node-cache");
var myCache = new NodeCache();


module.exports = {
    acquireToken: function (callback) {
        myCache.get('token', function (error, value) {
            if (error || value == undefined) {
                var context = new AuthenticationContext(O365Constants.authorityUrl);
                context.acquireTokenWithClientCredentials(O365Constants.resource, O365Constants.clientId, O365Constants.clientSecret,
                    function (err, tokenResponse) {
                        if (err) {
                            return null;
                        } else {
                            myCache.set('token', tokenResponse.accessToken);
                            callback(tokenResponse.accessToken);
                        }
                    });
                return;
            }
            callback(value);
        });
    },
    bookMeeting: function (name, date, time,callback) {
        this.acquireToken(function (token) {
            bookMeeting(token, name, date, time,callback);
        });
    }
}
function bookMeeting(token, name, date, time,callback) {
    var start = new Date(date + 'T' + time);
    var end = new Date(start.getTime() + 60 * 60000);
    request(
        {
            url: 'https://graph.microsoft.com/v1.0/users/amrfouad@insightme.onmicrosoft.com/calendar/events',
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: {
                'body': {
                    'contentType': 'text',
                    'content': 'Meeting with '+ name
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
            json:true
        })
        .on('error', function (err) {
            callback(err);
        })
        .on('response', function (response) {
            callback(response);
        });
}