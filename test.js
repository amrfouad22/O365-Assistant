var AuthenticationContext = require('adal-node').AuthenticationContext;
var fs=require('fs');
var request = require('request');
var O365Constants = require('./O365Constants.js');
var context = new AuthenticationContext(O365Constants.authorityUrl);
//var cert=fs.readFileSync('./MSGraphDaemonWithCert.pem',{encoding:'utf8'});
context.acquireTokenWithClientCredentials('00000002-0000-0000-c000-000000000000', '5410e17d-4de4-4cc4-b41d-45082d03641e', 'B1/W8qwjBQwfy+lNCVVIcAPCIDgHvQRfzDl0upFW52I=',
    function (err, tokenResponse) {
        if (err) {
            console.log('error' + err);
        } else {
            console.log('token:' + tokenResponse.accessToken);
        }
    });