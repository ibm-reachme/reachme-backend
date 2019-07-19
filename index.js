
let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);
const AssistantV2 = require('ibm-watson/assistant/v2');

const assistantName = "ReachMe";

// Set up Assistant service wrapper.
const service = new AssistantV2({
  iam_apikey: 'YdIwGy3ZZEFH46mpzkWtBE9DqOpBz8_ChPXmtvbF_iUc',
  version: '2019-06-24',
  url: 'https://gateway-lon.watsonplatform.net/assistant/api'
});
const assistantId = 'c14767b8-c271-4c18-8695-9e6da44af327';
let sessionId;

io.on('connection', (socket) => {
  //io.emit('message', { text: introMessage, from: assistantName, created: new Date() });

  // Create session and preserve the session id
  service
    .createSession({
      assistant_id: assistantId
    })
    .then(res => {
      console.log("Session created for ", socket.nickname);
      sessionId = res.session_id;
    })
    .catch(err => {
      console.log(err); // something went wrong
    });

  socket.on('disconnect', function () {
    io.emit('users-changed', { user: socket.nickname, event: 'left' });
    service
      .deleteSession({
        assistant_id: assistantId,
        session_id: sessionId,
      })
      .then(res => {
        console.log("Session closed for ", socket.nickname);
      })
      .catch(err => {
        console.log(err); // something went wrong
      });
  });

  socket.on('set-nickname', (nickname) => {
    socket.nickname = nickname;
    io.emit('users-changed', { user: nickname, event: 'joined' });
  });

  socket.on('add-message', (message) => {
    io.emit('message', { text: message.text, from: socket.nickname, created: new Date() });

    sendMessage({
      message_type: 'text',
      text: message.text // start conversation with empty message
    }).then(res => {
      let watsonMessage = processResponse(res);
      io.emit('message', { text: watsonMessage, from: assistantName, created: new Date() });
    }).catch(err => {
      console.log(err); // something went wrong
    });;
  });
});

// Send message to assistant.
function sendMessage(messageInput) {
  return service
    .message({
      assistant_id: assistantId,
      session_id: sessionId,
      input: messageInput
    });
}

// Process the response.
function processResponse(response) {
  // Display the output from assistant, if any. Supports only a single
  // text response.
  if (response.output.generic && response.output.generic.length > 0) {
    let responseString = "";
    for (index = 0; index < response.output.generic.length; index++) {
      if (response.output.generic[index].response_type === 'text') {
        responseString += response.output.generic[index].text;
      } else if (response.output.generic[index].response_type === 'option') {
        let array = response.output.generic[index].options;
        responseString += response.output.generic[0].title + ": \n";
      }
    }
    return responseString;
  } else if (response.output.intents && response.output.intents.length > 0) {

    let responseString = "";
    if (response.output.intents[0].intent === "need-help") {

      for (index = 0; index < response.output.entities.length; index++) {
        responseString += " " + response.output.entities[index].value;
      }
    }

    return responseString;
  }
}

var port = process.env.PORT || 3000;

http.listen(port, function () {
  console.log('listening in http://localhost:' + port);
});