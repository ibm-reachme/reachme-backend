
let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);
const AssistantV2 = require('ibm-watson/assistant/v2');

const introMessage = "Hello I am your assistant ReachMe. You can ask for any supplies in case of emergency";
const assistantName = "ReachMe";

// Set up Assistant service wrapper.
const service = new AssistantV2({
  iam_apikey: 'uhxr5zKspGaB6mhcLuASacq1NqsEVAr511u3LM8gj-k4', // replace with API key
  version: '2019-07-16',
  url: 'https://gateway-lon.watsonplatform.net/assistant/api'
});
const assistantId = '13af3e8c-2ec2-4d01-a3eb-8b928e6dfa43';
let sessionId;

io.on('connection', (socket) => {
  //io.emit('message', { text: introMessage, from: assistantName, created: new Date() });

  socket.on('disconnect', function () {
    io.emit('users-changed', { user: socket.nickname, event: 'left' });
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
      return 'asa';
    });;
  });
});

// Create session and preserve the session id
service
  .createSession({
    assistant_id: assistantId,
  })
  .then(res => {
    console.log(res);
    sessionId = res.session_id;
  })
  .catch(err => {
    console.log(err); // something went wrong
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
    if (response.output.generic[0].response_type === 'text') {
      return response.output.generic[0].text;
    }
  }
}

/**
 * Find a right place to close session in future. Currently unused
 */
function closeSession() {
  // We're done, so we close the session.
  service
    .deleteSession({
      assistant_id: assistantId,
      session_id: sessionId,
    })
    .catch(err => {
      console.log(err); // something went wrong
    });
}

var port = process.env.PORT || 3000;

http.listen(port, function () {
  console.log('listening in http://localhost:' + port);
});