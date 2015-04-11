var express = require('express')
  , app = express(app)
  , server = require('http').createServer(app);

var Eureca = require('eureca.io');
// serve static files from the current directory
app.use(express.static(__dirname));

  
//get EurecaServer class
var eurecaServer = new Eureca.Server({allow:['setId', 'spawnEnemy', 'kill', 'updateState']});

//create an instance of EurecaServer
// Inform Eureca.io that the following client functions are trusted client functions
// If we do not do this, eureca.io will not call these functions
// client list object to hold client data
var clients = [];
//attach eureca.io to our http server
eurecaServer.attach(server);


//eureca.io provides events to detect clients connect/disconnect

//detect client connection
eurecaServer.onConnect(function (conn) {    
    console.log('New Client id=%s ', conn.id, conn.remoteAddress);
    //the getClient method provide a proxy allowing the server to call remote client function
	var remote = eurecaServer.getClient(conn.id);
    //store the client details
	clients[conn.id] = {id:conn.id, remote:remote};
    //call setId which is defined in the client side
	remote.setId(conn.id);
});

//detect client disconnection
eurecaServer.onDisconnect(function (conn) {    
    console.log('Client disconnected ', conn.id);
	var removeId = clients[conn.id].id;

	delete clients[conn.id];

	for(var c in clients)
	{
		var remote = clients[c].remote;

		remote.kill(conn.id);
	}
});

eurecaServer.exports.handshake = function(id)
{
	//For all old clients, spawn a new enemy at 0,0 unless it is the client who initiated this
	for(var c in clients)
	{
		var remotef = clients[c].remote;
		remotef.spawnEnemy(id, 0, 0);
		var newclient = clients[id].remote;
		if(c == id)
		{
			console.log("Found new client!");
		for(var cc in clients)
		{
			var x = clients[cc].laststate ? clients[cc].laststate.x : 0;
			var y = clients[cc].laststate ? clients[cc].laststate.y : 0;
			console.log("Spawned new enemy with id ",cc,"at ",x," ",y);
			newclient.spawnEnemy(cc, x, y);
		}
		}	
	}
	//For the new client, spawn all existing enemies
	
};
 // whenever there is a change in user input, the client will call
// the server side handleKeys function. The handleKeys function will 
// in turn invoke the client updateState function. The updateState function
// will then update all the stickmans in a client's game.

eurecaServer.exports.handleKeys = function(state)
{
	var conn = this.connection;
	var updatedClient = clients[conn.id];

	for(var c in clients)
	{
		var remote = clients[c].remote; //Sets the client to update
		remote.updateState(updatedClient.id, state); //whenever a client presses a key, its keystrokes are sent to all clients

		clients[c].laststate = keys;
		console.log(clients[c].laststate);
	}
};
//Client should call this every frame it can - simply forwards
//the entire knowledge of server to each client when called.

server.listen(8000);

