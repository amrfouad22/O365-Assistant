var request = require('request');
module.exports = {
    getEmotion: function (url, callback) {
        request(
            {
                url: 'https://westus.api.cognitive.microsoft.com/emotion/v1.0/recognize',
                method: 'POST',
                headers: {
                    'Ocp-Apim-Subscription-Key': 'eed90e8144eb444088872bedcb9d9ed9',
                    'Content-Type': 'application/json'
                },
                body: {
                    'url': url
                },
                json: true
            }, function (err, response, body) {
                if (err) {
                    callback(err, null);
                }
                //successful call
                callback(null, getHighScoreEmotion(body));
            });
    }
}

function getHighScoreEmotion(body) {
    var val=0;;
    var emotion;
    if (body.length > 0) {
        for (score in body[0].scores) {
            if(body[0].scores[score]>val){
                val=body[0].scores[score];
                emotion=score;
            }
        }
        return emotion;
    }
    return null;
    
}