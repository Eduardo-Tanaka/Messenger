'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server

const request = require('request');
var sleep = require('sleep');

// carrega os valores do arquivo .env quando não for em produção, setar as variáveis de ambiente no provedor para usar em produção  
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

app.delete('/deleteGreeting', function(req, res) {
  deleteGreetingText(res);
});

app.get('/setupButton', function(req, res) {
  setupGetStartedButton(res);
});

app.get('/setupGreeting', function(req, res) {
  setupGreetingText(res);
});

function deleteGreetingText(res) {
  var messageData = {
    "fields": [
      "greeting"
    ]
  };

  request({
    url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + PAGE_ACCESS_TOKEN,
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    form: messageData
  }, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      // Print out the response body
      res.send(body);
    } else { 
      // TODO: Handle errors
      console.error(error);
      res.send(body);
    }
  });
}

function setupGreetingText(res) {
  var messageData = {
    "greeting": [
      {
        "locale": "default",
        "text": "Bem vindo {{user_first_name}}!!! Clique no botão para começarmos a conversar!"
      }
    ]
  };

  request({
    url: 'https://graph.facebook.com/v2.6/me/messenger_profile?access_token=' + PAGE_ACCESS_TOKEN,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    form: messageData
  }, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      // Print out the response body
      res.send(body);
    } else { 
      // TODO: Handle errors
      console.error(error);
      res.send(body);
    }
  });
}

function setupPersistentMenu(res) {
  var messageData = 
    { "persistent_menu": [
      {
        "locale": "default",
        "composer_input_disabled": false,
        "call_to_actions": [
          {
            "title": "Info",
            "type": "nested",
            "call_to_actions": [
              {
                "title": "Abrir",
                "type": "postback",
                "payload": "abrir"
              },
              {
                "title": "Info",
                "type": "postback",
                "payload": "info"
              }
            ]
          },
          {
            "type": "web_url",
            "title": "Visit website ",
            "url": "http://www.google.com",
            "webview_height_ratio": "full"
          }
        ]
      }
    ]
  };  

  // Start the request
  request({
    url: "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=" + PAGE_ACCESS_TOKEN,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    form: messageData
  }, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      // Print out the response body
      res.send(body);
    } else { 
      // TODO: Handle errors
      console.error(error);
      res.send(body);
    }
  });
}

function setupGetStartedButton(res){
  var messageData = {
    "get_started": {
      "payload": "getstarted"
    }
  };

  // Start the request
  request({
    url: "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=" + PAGE_ACCESS_TOKEN,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    form: messageData
  }, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      // Print out the response body
      res.send(body);
    } else { 
      // TODO: Handle errors
      console.error(error);
      res.send(body);
    }
  });
}

// Creates the endpoint for our webhook 
app.post('/webhook', (req, res) => {  
 
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the message. entry.messaging is an array, but 
      // will only ever contain one message, so we get index 0
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);
	  
  	  // Get the sender PSID
  	  let sender_psid = webhook_event.sender.id;
  	  console.log('Sender PSID: ' + sender_psid);

      // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);        
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = "teste-messenger-webhook";
    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
  
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;

  // Check if the message contains text
  if (received_message.text) {    

    // Create the payload for a basic text message, which
    // will be added to the body of our request to the Send API
    response = {
      "text": `Você enviou a mensagem: "${received_message.text}". Agora envie uma imagem!`
    }
  } else if (received_message.attachments) {
  
    // Gets the URL of the message attachment
    let attachment_url = received_message.attachments[0].payload.url;
  
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Esta é a imagem correta?",
            "subtitle": "Clique no botão para responder.",
            "image_url": attachment_url,
            "buttons": [
              {
                "type": "postback",
                "title": "Sim!",
                "payload": "sim",
              },
              {
                "type": "postback",
                "title": "Não!",
                "payload": "nao",
              },
              {
                "type": "postback",
                "title": "Começar!",
                "payload": "getstarted",
              }
            ],
          }]
        }
      }
    }
  } 
  
  callTypeOn(sender_psid, response);

  sleep.msleep(750);

  // Sends the response message
  callSendAPI(sender_psid, response); 
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  let response;
  
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'getstarted') {
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "button",
          "text": "Bem vindo ! O que você gostaria de fazer?",
          "buttons": [
            {
              "type": "postback",
              "title": "Abrir",
              "payload": "abrir"
            },
            {
              "type": "postback",
              "title": "Informações",
              "payload": "info"
            },
            {
              "type": "postback",
              "title": "Outro",
              "payload": "outro"
            }
          ]
        }
      }
    }
  } else if (payload === 'sim') {
    response = { "text": "Obrigado!" }
  } else if (payload === 'nao') {
    response = { "text": "Oops, tente mandar outra imagem." }
  } else if (payload === 'abrir') {
    response = { "text": "Vamos começar " }
  } else if (payload === 'info') {
    response = { "text": "Informações .... TODO ..." }
  } else if (payload === 'outro') {
    response = { "text": "Outro .... TODO ..." }
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

// Sends response messages via the Send API
function callTypeOn(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "sender_action": "typing_on"
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}