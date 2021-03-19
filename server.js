const express = require('express');
const app = express();
const server = require('http').createServer(app);
app.use(express.json());

const cors = require('cors')

const WebSocket = require('ws');
const { publicDecrypt } = require('crypto');

const wss = new WebSocket.Server({server:server});


app.use(cors());

var klijent;
var resp=null;

wss.on('connection', function connection(ws){

console.log("Client connected ");

ws.send("Connected");

ws.on('message',  (message) =>{

  message = JSON.parse(message);

  if(message.key === 'clientConnected'){
    klijent = ws;

  } else if (message.key === "image"){
    //resp.send("You got something");
    resp.send(message.value);
  }else if (message.key === "testImage"){
    //resp.send("You got something");
    console.log(message.value);
  }

});

});

// { pcID, pcName, socket, response }

var server_port = process.env.YOUR_PORT || process.env.PORT || 25565;
var server_host = process.env.YOUR_HOST || '0.0.0.0';

app.get('/screenshot', (req,res) => {

  klijent.send("getScreenshot");

  resp=res;
  
});

app.post('/cget', (req,res) => {

  console.log("Got c# post "+req.key);
  res.send("sometekst");
  
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

  }else if( komanda==='echo'){
    console.log("Dobili smo komandu echo i parametar"+parametri.parametar1);
    response.send("Dobili smo komandu echo i parametar "+parametri.parametar1);

  }else if(komanda==='erase'){
    console.log("Dobili smo komandu erase i parametar"+parametri.parametar1);
    response.send("Dobili smo komandu erase i parametar "+parametri.parametar1);

  }else if(komanda==='kill'){
    console.log("Dobili smo komandu kill i parametar"+parametri.parametar1);
    response.send("Dobili smo komandu kill i parametar "+parametri.parametar1);

  }else if(komanda=='ls'){
    console.log("Dobili smo komandu ls i nema paramtera");
    response.send("Dobili smo komandu ls i nema paramtera");

  }else if(komanda==='move'){
    console.log("Dobili smo komandu move i parametar"+parametri.parametar1);
    response.send("Dobili smo komandu move i parametar "+parametri.parametar1);

  }else if(komanda=='rd'){
    console.log("Dobili smo komandu rd i parametar"+parametri.parametar1);
    response.send("Dobili smo komandu rd i parametar "+parametri.parametar1);

  }else if(komanda==='set'){
    console.log("Dobili smo komandu set i parametar"+parametri.parametar1);
    response.send("Dobili smo komandu set i parametar "+parametri.parametar1);

  }else if(komanda==='?'){
    console.log("Dobili smo komandu '?' i nema paramtera");
    response.send("Dobili smo komandu '?' i nema paramtera");

  }

});


server.listen(server_port, () => console.log("Listening on port "+server_port));




