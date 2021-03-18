// npm install uNetworking/uWebSockets.js#v18.14.0
const { json } = require('express');
const uWS = require('uWebSockets.js');

// an "app" is much like Express.js apps with URL routes,
// here we handle WebSocket traffic on the wildcard "/*" route

const app = uWS.App().ws('/*', {  // handle messages from client

  open: (socket, req) => {
    /* For now we only have one canvas */
    socket.send("Connected");
    console.log("Someone connected");
  },
  message: (socket, message, isBinary) => {

    var theMessage =JSON.parse(Buffer.from(message));

    if(theMessage.key === 'subscribeToImage'){
      socket.subscribe('imageReciever');
      socket.send("subscribed");
    }

    else if(theMessage.key === 'image'){
      app.publish("imageReciever",theMessage.value);
    }

    console.log("I got "+theMessage.key + " " +theMessage.value);
    
  }
}).get('/', (res,req) => {

  res.end("Nothing to see here");

});

app.listen(25565, (listenSocket) => {
  if (listenSocket) {
    console.log('Listening to port 25565');
  }
});

