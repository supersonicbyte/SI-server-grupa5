var express = require('express');
var app = express();

// on the request to root (localhost:3000/)
app.get('/api/devices/CheckIfDeviceBelongsToUser/:id', function (req, res) {
    console.log("jjjjj");
    const id = req.params.id;
    if ( id === "abc") {
        res.status(200);
        res.send({message: "Valid unique code of agent!"});
    } else {
        res.status(404);
        res.send({message: "Invalid unique code!"});
    }
   /* var code=req.body.code;
    console.log(code);
    if (code==="abc123") {
        res.send({message: "Valid"});
        res.status(200);
        console.log("Validan inst kod")
    } else {
        res.send({message: "Invalid"});
        res.status(404);
    }*/
});

// start the server in the port 3000 !
app.listen(8000, function () {
    console.log('Example app listening on port 8000.');
});