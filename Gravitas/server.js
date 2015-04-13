var express = require('express')
  , app = express(app)
  , server = require('http').createServer(app);

var Eureca = require('eureca.io');
// serve static files from the current directory
app.use(express.static(__dirname));

  
//get EurecaServer class
var eurecaServer = new Eureca.Server({allow:['setId', 'spawnEnemy', 'kill', 'updateState', 'roomStatus', 'getRoomInfo', 'readyUp']});

//create an instance of EurecaServer
// Inform Eureca.io that the following client functions are trusted client functions
// If we do not do this, eureca.io will not call these functions
// client list object to hold client data
var clients = [];
var roomList = [[]];
var roomNo = 0;
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

	console.log('Client attempting to leave room');
	console.log(roomList.length);
	for(var i = 0; i< roomList.length; i++)
	{
		//Look through all rooms for the client disconnecting.
		var elementPos = roomList[i].indexOf(removeId);
	if(elementPos != -1)
		{
			roomList[i].splice(elementPos ,1);
			console.log("element removed at ",elementPos, " from room ", i);
		}
	}
	
	
	delete clients[conn.id];

	for(var c in clients)
	{
		var remote = clients[c].remote;

		remote.kill(conn.id);
	}
	
	
});



eurecaServer.exports.provideRoomInfo = function (id)
{
    // for all the rooms in the Gravitas
    console.log("entered provideroom info");
    for (var r in roomList){
        console.log("searching id in rooms");
        //accessing a particular room
     var room = roomList[r];
        //for(var c in room[c]){
        for(var i = 0; i< room.length; i++){
            if (room[i] === id)
            {   
                console.log("found id in room");
                var remote = clients[id].remote;
                remote.getRoomInfo(room);
            }
        }
    }
};


eurecaServer.exports.handshake = function(id, clientx, clienty)
{
    //problematic way of updating room info
    //updating room info even though i loop through
    // players that are not in my room
	for(var r in roomList)
	{
        var room = roomList[r];
        for (var i=0; i< room.length; i++){
            if(room[i] !==id)
            {
            var remote = clients[room[i]].remote;
            var remote2 = clients[room[i]].remote;
            remote.getRoomInfo(room);
            remote2.spawnEnemy(id, clientx, clienty, 'center'); //Spawn new guy for all the old clients
                console.log("Spawned newguy at ",clientx," ",clienty);
            }
            if(room[i] === id)
            {
                var newguy = clients[room[i]].remote;
            for(var cc in clients)
                {
                    console.log(clients[cc]);
                    if(cc!==id)
                    {
                var x = clients[cc].laststate ? clients[cc].laststate.x: 0;
                var y = clients[cc].laststate ? clients[cc].laststate.y: 0;
                var angle = clients[cc].laststate ? clients[cc].laststate.angle: 0;
                console.log("This is angle ", angle);
                newguy.spawnEnemy(clients[cc].id, x, y,angle);
                console.log("Spawned enemy for newguy at ",x," ",y);
                console.log("spawned enemy for newguy angle", angle);
                    }
            }
            }
        }

	}
};
 // whenever there is a change in user input, the client will call
// the server side handleKeys function. The handleKeys function will 
// in turn invoke the client updateState function. The updateState function
// will then update all the stickmans in a client's game.

eurecaServer.exports.handleKeys = function(keys)
{
	var conn = this.connection;
	var updatedClient = clients[conn.id];
    
    for(var r in roomList)
    {
        var room = roomList[r];
        for(var c in room){
            console.log(room[c]);
		      var remote = clients[room[c]].remote;//Sets the client to update
		      remote.updateState(updatedClient.id, keys); //whenever a client presses a key, its keystrokes are               sent to all clients

	   }
	   updatedClient.laststate = keys;
        console.log(updatedClient.laststate);
    }


};

//Client should call this every frame it can - simply forwards
//the entire knowledge of server to each client when called.

eurecaServer.exports.joinRoom = function(clientID)
{
	var roomFound = false;
    console.log('New client attempting to join room');
	console.log('Client name is ', clientID);
	for(room in roomList)
	{
		var roomLength = roomList[room].length;
		if(roomLength < 4)
		{
			roomList[room][roomLength] = clientID;
			roomFound = true;
			console.log("Room joined at ", room, " with index ", roomLength);

			if(roomLength == 3)
			{
				console.log("Ready up!");
				//Notify all clients in room of readiness
				for(var i = 0; i < roomLength+1; i++)
				{
					aclient = roomList[room][i];
					console.log(aclient);
					clients[aclient].remote.readyUp();
				}
			}
			break;
		}
	}
	if(!roomFound)
	{
		if(roomList.length == undefined)
			roomList[0] = []; 
		roomList[roomList.length] = [clientID];
		console.log("Room created at ", roomList.length-1);
	}
}

eurecaServer.exports.leaveRoom = function(clientID)
{
	console.log('Client attempting to leave room');
	for(room in roomList)
	{
		for(var i=0;i<room.length;i++)
		{
			if(room[i] == clientID)
			{
				room.splice(i, 1);
				console.log("Client has left room.");
			}
		}
	}
}


server.listen(8000);

