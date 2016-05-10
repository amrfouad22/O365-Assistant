var restify = require('restify');
var builder = require('botbuilder');
var request=require('request');
var constants=require('./LuisConstant.js');
var o365=require('./Office365Connect.js');
var dateFormat = require('dateformat');

// Create bot and add dialogs
var bot = new builder.BotConnectorBot({ appId:constants.appID, appSecret: constants.appSecret });
var dialog = new builder.LuisDialog(constants.url);
dialog.userData={};
bot.add('/', dialog);
dialog.onDefault(builder.DialogAction.send("I'm sorry. I didn't understand that, please try something else.."));
dialog.on('welcome',function(session){
    session.send('Hi , How can I help you?');
});
dialog.on('bookmeeting', [
    function (session, args, next) {
        dialog.userData.name = builder.EntityRecognizer.findEntity(args.entities, 'name');
        dialog.userData.date= builder.EntityRecognizer.findEntity(args.entities, 'builtin.datetime.date');
        dialog.userData.time = builder.EntityRecognizer.findEntity(args.entities, 'builtin.datetime.time');
        next();        
    },
    function(session,args,next){
        if(!dialog.userData.name){
            builder.Prompts.text(session,'Who Shall I book the meeting with?');
        }
        else{
            dialog.userData.name=dialog.userData.name.entity;
            next();
        }
    },
    function(session,results,next){
      if(results.response)  
      {
          dialog.userData.name=results.response;
      }
      if(!dialog.userData.date||!dialog.userData.time){
        builder.Prompts.time(session,'and When you would like me to book it?');
      }
      else{
          //fix the date resolution objects
          dialog.userData.date=dialog.userData.date.resolution.date;
          dialog.userData.time=dialog.userData.time.resolution.time;
          if(dialog.userData.time.indexOf(':')<0)
          {
              dialog.userData.time+=':00';
          }
          var str=dialog.userData.date+dialog.userData.time+'+10:00';       
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
          dialog.userData.date=dateFormat(date,'isoDate');
          dialog.userData.time=dateFormat(date,'isoTime');
      }
      //got all the necessary information here
      o365.bookMeeting(dialog.userData.name,dialog.userData.date,dialog.userData.time,function(data){
            if(data.statusCode==201){
                session.send('booked a meeting with %s on %s at %s',dialog.userData.name,dialog.userData.date,dialog.userData.time);
            }
            else{
                session.send('Couldn\'t book the meeting please try again later');
            }
      });
    },
]);
// Setup Restify Server
var server = restify.createServer();
server.post('/api/messages', bot.verifyBotFramework(), bot.listen());
server.listen(process.env.port || 3978, function () {
    console.log('%s listening to %s', server.name, server.url); 
});
