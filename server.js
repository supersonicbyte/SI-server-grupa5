
/*
const { json } = require('express');
const uWS = require('uWebSockets.js');
const cors = require('cors');



const app = uWS.App().ws('/*', {  

  open: (socket, req) => {
    socket.send("Connected");
    console.log("Someone connected "+socket.value);
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


*/

const express = require('express');
const app = express();
const server = require('http').createServer(app);
app.use(express.json());

const cors = require('cors')

const WebSocket = require('ws');

const wss = new WebSocket.Server({server:server});

app.use(cors());

wss.on('connection', function connection(ws){

console.log("CLient connected");
ws.send("Connected");

ws.on('message', function incoming(message){

  console.log("Received "+message);

})

});

var server_port = process.env.YOUR_PORT || process.env.PORT || 25565;
var server_host = process.env.YOUR_HOST || '0.0.0.0';


app.get('/komanda', (req,res) => {
  
  
});

app.post('/komanda', function(request, response){
  var komanda = request.body.command.komanda;
  var parametri = request.body.command.parametri;

  if(komanda==='cd'){

    console.log("Dobili smo komandu cd i parametar "+parametri.parametar1);
    response.send("Dobili smo komandu cd i parametar "+parametri.parametar1);

  } else if(komanda==='clear'){

    console.log("Dobili smo komandu clear i nema paramtera");
    response.send("Dobili smo komandu clear i nema paramtera");

  }

});




server.listen(server_port, () => console.log("Listening on port "+server_port));




