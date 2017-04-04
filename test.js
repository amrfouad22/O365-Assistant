var AuthenticationContext = require('adal-node').AuthenticationContext;
var fs=require('fs');
var request = require('request');
var O365Constants = require('./O365Constants.js');
var context = new AuthenticationContext(O365Constants.authorityUrl);
var cert=fs.readFileSync('./MSGraphDaemonWithCert.pem',{encoding:'utf8'});
context.acquireTokenWithClientCertificate('https://insightme.sharepoint.com', O365Constants.clientId, cert,'e2d42d20a81542385983850152105a69f7d79190',
    function (err, tokenResponse) {
        if (err) {
            console.log('error' + err);
        } else {
            console.log('token:' + tokenResponse.accessToken);
        }
    });