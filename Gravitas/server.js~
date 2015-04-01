var express = require('express')
  , app = express(app)
  , server = require('http').createServer(app);

// serve static files from the current directory
app.use(express.static(__dirname));

  
//get EurecaServer class
var EurecaServer = require('eureca.io').EurecaServer;

//create an instance of EurecaServer
var eurecaServer = new EurecaServer({allow:['setId', 'spawnEnemy', 'kill', 'updateState']});
var clients = [];
//attach eureca.io to our http server
eurecaServer.attach(server);


//eureca.io provides events to detect clients connect/disconnect

//detect client connection
eurecaServer.onConnect(function (conn) {    
    console.log('New Client id=%s ', conn.id, conn.remoteAddress);
	var remote = eurecaServer.getClient(conn.id);
	clients[conn.id] = {id:conn.id, remote:remote};
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

eurecaServer.exports.handshake = function()
{
	for(var c in clients)
	{
		var remote = clients[c].remote;
		for(var cc in clients)
		{
			var x = clients[cc].laststate ? clients[cc].laststate.x: 0;
			var y = clients[cc].laststate ? clients[cc].laststate.y: 0;
			
			remote.spawnEnemy(clients[cc].id, 0, 0);
		}
	}
}

eurecaServer.exports.handleKeys = function(keys)
{
	var conn = this.connection;
	var updatedClient = clients[conn.id];

	for(var c in clients)
	{
		var remote = clients[c].remote;
		remote.updateState(updatedClient.id, keys);

		clients[c].laststate = keys;
	}
}

server.listen(8000);
