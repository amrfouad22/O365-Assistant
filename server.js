var restify = require('restify');
var builder = require('botbuilder');
var request=require('request');
var constants=require('./LuisConstant.js');
var o365=require('./Office365Connect.js');
var dateFormat = require('dateformat');

var connector = new builder.ChatConnector({
    appId: constants.appID,
    appPassword: constants.appSecret
});
var bot = new builder.UniversalBot(connector);

var recognizer = new builder.LuisRecognizer(constants.url);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);
//default 
dialog.onDefault(builder.DialogAction.send("I'm sorry. I didn't understand that, please try something else.."));
//welcome

dialog.matches('welcome',function(session){
    session.send('Hi , How can I help you?');
});
//book a meeting waterfall
dialog.matches('bookmeeting', [
    function (session, args, next) {
        //initialize the userdata object
        session.userData={};
        session.userData.name = builder.EntityRecognizer.findEntity(args.entities, 'name');
        session.userData.date= builder.EntityRecognizer.findEntity(args.entities, 'builtin.datetime.date');
        session.userData.time = builder.EntityRecognizer.findEntity(args.entities, 'builtin.datetime.time');
        next();        
    },
    function(session,args,next){
        if(!session.userData.name){
            builder.Prompts.text(session,'Who Shall I book the meeting with?');
        }
        else{
            session.userData.name=session.userData.name.entity;
            next();
        }
    },
    function(session,results,next){
      if(results.response)  
      {
          session.userData.name=results.response;
      }
      if(!session.userData.date||!session.userData.time){
        builder.Prompts.time(session,'and When you would like me to book it?');
      }
      else{
          //fix the date resolution objects
          session.userData.date=session.userData.date.resolution.date;
          session.userData.time=session.userData.time.resolution.time;
          if(session.userData.time.indexOf(':')<0)
          {
              session.userData.time+=':00';
          }
          var str=session.userData.date+session.userData.time+'+10:00';       
          var results={
              response:{
                  resolution:{
                      start:new Date(str)
                  }
              }
          }
          next(results);
      }
    },
    function(session,results,next){
      if(results.response)  
      {
          var date=new Date(results.response.resolution.start);
          session.userData.date=dateFormat(date,'isoDate');
          session.userData.time=dateFormat(date,'isoTime');
      }
      //got all the necessary information here
      o365.bookMeeting(session.userData.name,session.userData.date,session.userData.time,function(data){
            if(data.statusCode==201){
                session.send('booked a meeting with %s on %s at %s',session.userData.name,session.userData.date,session.userData.time);
            }
            else{
                session.send('Couldn\'t book the meeting please try again later');
            }
      });
    },
]);
// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});
server.post('/api/messages',function(req,res,next){
    console.log(req.body);
    next();
},connector.listen());
