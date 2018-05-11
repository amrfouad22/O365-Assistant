var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var constants = require('./LuisConstant.js');
var o365 = require('./Office365Connect.js');
var dateFormat = require('dateformat');
var emotion = require('./emotionAPI.js');
var messages = require('./messageMap.js');
var azure = require('botbuilder-azure'); 

//state store in cosmos db
var documentDbOptions = {
    host: 'https://insightme.documents.azure.com:443', 
    masterKey: 'gissQgB4sDmXNlZuMgD3aUzaV2gb80bedsnFqlEFyY50c47a5nepefJ9T37Jf473xUjpR0cGybsqWgc4qemtKw==', 
    database: 'botdocs',   
    collection: 'botdata'
};

var docDbClient = new azure.DocumentDbClient(documentDbOptions);
var cosmosStorage = new azure.AzureBotStorage({ gzipData: false }, docDbClient);

//bot setup
var connector = new builder.ChatConnector({
    appId: constants.appID,
    appPassword: constants.appSecret
});
var bot = new builder.UniversalBot(connector).set('storage', cosmosStorage);

var recognizer = new builder.LuisRecognizer(constants.url);
var dialog = new builder.IntentDialog({
    recognizers: [recognizer]
});
bot.dialog('/', dialog);
//default 
dialog.onDefault(function (session, args) {
    if (session.message.attachments.length > 0) {
        emotion.getEmotion(session.message.attachments[0].contentUrl, function (error, emotion) {
            if (!error) {
                if (emotion == null) {
                    session.send('sorry couldn\'t detect any emotions #epicfail');
                } else {
                    session.send(messages.responses[emotion].message);
                }
            } else {
                session.send("I'm sorry. I didn't understand that, please try something else..");
            }
        })
    } else {
        session.send("I'm sorry. I didn't understand that, please try something else..");
    }
});
//welcome
dialog.matches('welcome', function (session) {
    session.send('Hi , How can I help you?');
    console.log(session.message.address);
});
dialog.matches('signin',function(session){
    o365.acquireUserCode(function(response){
        var dialog = new builder.SigninCard(session);
        dialog.text(response.message);
        dialog.button('Click here', response.verificationUrl);
        var msg = new builder.Message();
        msg.addAttachment(dialog);
        session.send(response.message);
        session.userData={};
        session.userData.loggedIn=response;
    });
});
//book a meeting waterfall
dialog.matches('bookmeeting', [
    function (session, args, next) {
        //initialize the userdata object
        session.userData.name = builder.EntityRecognizer.findEntity(args.entities, 'name');
        session.userData.date = builder.EntityRecognizer.findEntity(args.entities, 'builtin.datetime.date');
        session.userData.time = builder.EntityRecognizer.findEntity(args.entities, 'builtin.datetime.time');
        next();
    },    
    function (session, args, next) {
        if (!session.userData.name) {
            builder.Prompts.text(session, 'Who Shall I book the meeting with?');
        } else {
            session.userData.name = session.userData.name.entity;
            next();
        }
    },
    function (session, results, next) {
        if (results.response) {
            session.userData.name = results.response;
        }
        if (!session.userData.date || !session.userData.time) {
            builder.Prompts.time(session, 'and When you would like me to book it?');
        } else {
            //fix the date resolution objects
            session.userData.date = session.userData.date.resolution.date;
            session.userData.time = session.userData.time.resolution.time;
            if (session.userData.time.indexOf(':') < 0) {
                session.userData.time += ':00';
            }
            var str = session.userData.date + session.userData.time + '+10:00';
            var results = {
                response: {
                    resolution: {
                        start: new Date(str)
                    }
                }
            }
            next(results);
        }
    },
    function (session, results, next) {
        if (results.response) {
            var date = new Date(results.response.resolution.start);
            session.userData.date = dateFormat(date, 'isoDate');
            session.userData.time = dateFormat(date, 'isoTime');
            //got all the necessary information here                        
            o365.bookMeeting2(session.userData.loggedIn,session.userData.name, date, function (data) {
                if (data.statusCode == 201) {
                    session.send('booked a meeting with %s on %s at %s', session.userData.name, session.userData.date, session.userData.time);
                } else {
                    session.send('Couldn\'t book the meeting please try again later');
                }
            });            
            /*o365.bookMeeting(session.userData.name, date, function (data) {
                if (data.statusCode == 201) {
                    session.send('booked a meeting with %s on %s at %s', session.userData.name, session.userData.date, session.userData.time);
                } else {
                    session.send('Couldn\'t book the meeting please try again later');
                }
            });*/
        }
    },
]);
//
bot.on('conversationUpdate', function (message) {
    console.log(message.address);
});
bot.on('contactRelationUpdate', function (message) {
    console.log(message.address);
});


// Setup Restify Server
var server = restify.createServer();
server.use(restify.bodyParser());
server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
server.post('/api/messages', connector.listen());
server.post('/api/proactive', function (req, res) {
        var address = require('./address.js');
        var msg = new builder.Message().address(address);
        msg.text(req.body);
        bot.send(msg);
        res.send(200);
    });

server.post('/api/alert', function (req, res) {
    var address = require('./address.js');
    var msg = new builder.Message().address(address);
    msg.text(req.body);
    msg.data.channelData={
        notification: {
            alert: 'true'
        }
    };
    msg.data.summary="this is an alert summary";
    bot.send(msg);
    res.send(200);
});