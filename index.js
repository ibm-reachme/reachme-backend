
let app = require('express')();
let http = require('http').Server(app);
let io = require('socket.io')(http);
const AssistantV2 = require('ibm-watson/assistant/v2');

const assistantName = "ReachMe";

// Set up Assistant service wrapper.
const service = new AssistantV2({
  iam_apikey: '1zsacDSXVox2FR8V3zEUryGAn1DfsFr5r6m3P003oGpV',
  version: '2019-06-24',
  url: 'https://gateway-wdc.watsonplatform.net/assistant/api'
});
const assistantId = '4c0dfcf5-5ad2-498c-8e88-1c38ab423334';
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
    });;
  });
});

// Create session and preserve the session id
service
  .createSession({
    assistant_id: assistantId
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
    } else if (response.output.generic[0].response_type === 'option') {
      let array = response.output.generic[0].options;
      let responseString = response.output.generic[0].title + ": \n";
      for (index = 0; index < array.length; index++) {
        responseString += " " + array[index].label;
      }

      return responseString;

    }
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