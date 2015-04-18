var myId = 0;
var stickman;
var player;
var stickmanList;
var enemyBullets;
var enemiesTotal;
var enemiesAlive;
var explosions;
var logo;
var cursors;
var bullets;
var fireRate = 100;
var nextFire = 0;
var platforms;
var facing;
var readyToMove=false;
var guns;    
var hasGun = 0;

var bullet;    
var bulletTime = 0;

var ready = false;

var eurecaServer;
var room;

var GAME_WIDTH = 1600;
var GAME_HEIGHT = 800;

var spriteToBeRotated;
var left;
var right;
var up;
var down;
var shift;
//var angle = 0;

var then;
var now;
var serverLag=0;
var lagArray=[];
var firstPress=[];
var lagValueArray=[];
var music;
var shootsound;
var localLag = 0;
var localLagThen;
var localLagNow;


//this function will handle client communication with the server
var eurecaClientSetup = function(){
 	start_button.destroy();
    //create an instance of eureca.io client
    var eurecaClient = new Eureca.Client();
    
    eurecaClient.ready(function (proxy) {       
        eurecaServer = proxy;
    });

    //All methods defined under the exports namespace are available
    //for remote process calling (Server is able to call these client functions)
    //Set player ID from server, create the game, run server handshake. 
    eurecaClient.exports.setId = function(id)
    {
        myId = id;
        console.log('This player id is ', id);
		eurecaServer.joinRoom(myId);
        eurecaServer.provideRoomInfo(id);
        create();
        console.log("sending server my id to find my room");
        ready = true;
    };
    //When a stickman dies on the server, send the kill notification
    eurecaClient.exports.kill = function(id)
    {
        if(stickmanList[id])
        {
            stickmanList[id].kill();
            console.log('killing ', id, stickmanList[id]);
        }
    };
    //Spawn another client, provided its not this client itself, indicating error.
    eurecaClient.exports.spawnEnemy = function(i, x, y, angle)
    {
        if (i == myId) return;
        console.log('SPAWN new stickman at ',x,' ',y,'hello',angle);
        console.log('ID is ', i);
        for(var c=0; c< room.length; c++){
            var enemyid = room[c];
            console.log("enemy id", enemyid);
            if (enemyid === i){
                var stckman = new StickMan(i, game, stickman, x, y,angle); //NOTE SPELLING not that it matters since                  this is enclosed;
                stickmanList[i] = stckman;
            }
        }

    };
    //Server calls this to make clients update their state; this function is called x times for each stickman in the list
    eurecaClient.exports.updateState = function(id, state)
    {
        if(stickmanList[id]) {
			if(stickmanList[id] !== player)
			{
            stickmanList[id].cursor = state; //left/right/up/fire states
            stickmanList[id].stickman.x = state.x; //Snap stickman to received x
            stickmanList[id].stickman.y = state.y; //Snap stickman to received y
            stickmanList[id].stickman.angle = state.angle; //Snap stickman to received angle
			}
			else if(stickmanList[id] == player)
			{
				localLagNow = Date.now();
				if((localLagNow - then) >= localLag)
				{
				 stickmanList[id].cursor = state; //left/right/up/fire states
                 stickmanList[id].stickman.x = state.x; //Snap stickman to received x
                 stickmanList[id].stickman.y = state.y; //Snap stickman to received y
				 stickmanList[id].stickman.angle = state.angle; //Snap stickman to received angle	
				}
			}
			stickmanList[id].update(id); //Run stickman update routine
        }
		if(stickmanList[id] == player) {
			now = Date.now();
			if(!serverLag)
			{
				serverLag = now - then;
			}
			else
			{
				serverLag = 0.8*(serverLag) + 0.2*(now - then);
			}
			console.log("Server lag is: ", serverLag);
		} //If it is own stickman's update, use this to time lag.
		else
		{
			if(stickmanList[id].cursor.lag)
			{	
			lagArray[id] = stickmanList[id].cursor.lag;
				firstPress[id] = true;
			}
			
		}
    };  
	eurecaClient.exports.roomStatus = function(roomlength)
	{
		console.log("Room has ", roomlength, " players.");
	};
    
    eurecaClient.exports.getRoomInfo = function(room1)
    {
    console.log(room1);
    console.log("get room info");    
     room = room1;   
    };

	eurecaClient.exports.readyUp = function()
	{
		readyToMove = true;
	};
    
    
};


StickMan = function(index, game, player, serverx, servery, sangle) {
    //this.id = index;
    
    this.cursor = {
		left:false,
		right: false,
		up: false,
        down: false,
		fire: false,
        shift: false
	};

	this.input = {
		left:false,
		right:false,
		up:false,
        down: false,
		fire:false,
        shift: false
	};
    
	//Zero if originally not present on server, as specified in server.js;
	//Other values if spawned.
	var x = serverx;
	var y = servery;
	
	this.game = game;
	//this.health = 30;
	this.player = player;
	this.bullets = game.add.group();
	this.bullets2 = game.add.group();
	this.bullets.enableBody = true;
	this.bullets2.enableBody = true;
	this.bullets.physicsBodyType = Phaser.Physics.ARCADE;
	this.bullets2.physicsBodyType = Phaser.Physics.ARCADE;
	this.bullets.createMultiple(5, 'bullet', 0, false); //quantity, key, frame, default exists state (false, since it doesn't exist until created).
	this.bullets.setAll('anchor.x', 0.5); 
	this.bullets.setAll('anchor.y', 0.5);
	//Kill bullets when they leave the boundaries of the world
	this.bullets.setAll('outOfBoundsKill', true);
	this.bullets.setAll('checkWorldBounds', true);
	this.bullets2.createMultiple(20, 'bullet', 0, false); //quantity, key, frame, default exists state (false, since it doesn't exist until created).
	this.bullets2.setAll('anchor.x', 0.5); 
	this.bullets2.setAll('anchor.y', 0.5);
	//Kill bullets when they leave the boundaries of the world
	this.bullets2.setAll('outOfBoundsKill', true);
	this.bullets2.setAll('checkWorldBounds', true);


	this.currentSpeed = 0;
	this.fireRate = 500; //Milliseconds before another firing
	this.nextFire = 0;
	this.alive = true;
	this.guntype = "";

	spriteToBeRotated = this.stickman = game.add.sprite(x, y,'dude');
	console.log("Spawning new stickman at ",x," ",y);
	this.stickman.frame = 4;
	this.stickman.anchor.set(0.5);
	this.stickman.id = index;
	game.physics.enable(this.stickman, Phaser.Physics.ARCADE);
	this.stickman.body.immovable = false;
	//this.stickman.body.collideWorldBounds = true;

	this.stickman.angle = sangle;    
    // player properties
    this.stickman.body.bounce.y = 0.0;
    this.stickman.body.gravity.y = 200;
    this.stickman.body.collideWorldBounds = true;

    //stats
    var style = { font: "20px Arial", fill: "#fff"};
    this.stickman.health = 100;
    this.game.add.text(10, 20, "Health:", style);
    this.healthText = this.game.add.text(80, 20, "", style);


    // walking right or left
    this.stickman.animations.add('left', [0, 1, 2, 3], 10, true);
    this.stickman.animations.add('right', [5, 6, 7, 8], 10, true);

	game.physics.arcade.velocityFromRotation(this.stickman.rotation, 0, this.stickman.body.velocity);
};

StickMan.prototype.snapShot = function() {
	this.input.left = false;
	this.input.right = false;
	this.input.up = false;

	this.input.fire = false;
    this.shift = false;
    
    
    
	this.input.tx = 0;
	this.input.ty = 0;
    this.input.x = this.stickman.x;
	this.input.y = this.stickman.y;
    
    
	this.input.angle = 0;
	this.input.lag = serverLag;
	console.log("snapShot: ");
	console.log(this.input);
	then = Date.now();
	eurecaServer.handleKeys(this.input);
};

StickMan.prototype.getInput = function() {  //Differentiate between Stickman.update for stickman positions and movement, and getInput for getting player input.
    	var highWater = 0;
	for(var i in lagValueArray)
	{
		if(i > highWater)
		{
			highWater = i; //Find laggiest client
		}
	}
	
	if(highWater > 100)
	{
		localLag = 100;
	}
	else
	{
		localLag = highWater;
	}
	
	var inputChanged = (
			this.cursor.left != this.input.left ||
			this.cursor.right != this.input.right ||
			this.cursor.up != this.input.up ||
            (this.cursor.right != this.input.right  &&  this.cursor.shift!= this.input.shift)||
         (this.cursor.left != this.input.left &&  this.cursor.shift!= this.input.shift)||
			this.cursor.fire != this.input.fire
	);   
    
	if(inputChanged && readyToMove)
	{
		    //Send values to server
			this.input.x = stickman.x;
			this.input.y = stickman.y;
        this.input.angle = stickman.angle;
		this.input.lag = serverLag;
			//console.log(this.input.timestamp);
                     
			// whenever there is a change in user input, the client will call
            // the server side handleKeys function. The handleKeys function will 
            // in turn invoke the client updateState function. The updateState function
            // will then update all the stickmans in a client's game.
		then = Date.now();
		eurecaServer.handleKeys(this.input);

			//Besides these three values, tx and ty are updated.
			//angle is not currently useful, and should always be 0.
	}
};


StickMan.prototype.update = function(id) { //StickMan.update is a positional update to be run for a stickman once per frame.
    
	if(stickman == this.stickman)
	{//Remember stickman is short for player.stickman, and player refers to the player's StickMan object.
		this.healthText.text = this.stickman.health; //Update health every time this is called.
	}
	var lagValue = (lagArray[id]/1000)+(serverLag/1000);
	lagValueArray[id] = lagValue;
	

	if(this.cursor.up)
	{
		if(this.stickman.body.touching.down || this.stickman.body.blocked.down) //Ground
		{
			if(this.stickman.angle === 0)
			{
				console.log("Attempting to jump -down");
				this.stickman.body.velocity.y = -350;
				this.stickman.body.velocity.x = 0;
			}
			/*if(firstPress[id] == true)
			{
				//Snap it to real extrapolated position based on lag.
				this.stickman.body.velocity.y -= lagValue*this.stickman.body.velocity.y;
			}*/
		}
		else if(this.stickman.body.touching.up || this.stickman.body.blocked.up)
		{
			if(this.stickman.angle === -180)
			{
				console.log("Attempting to jump - up.");
				this.stickman.body.velocity.y = 350;
				this.stickman.body.velocity.x = 0;
			}
			/*if(firstPress[id] == true)
			{
				//Snap it to real extrapolated position based on lag.
				this.stickman.body.velocity.y += lagValue*this.stickman.body.velocity.y;
			}*/
			
		}
		else if(this.stickman.body.touching.left || this.stickman.body.blocked.left)
		{
			if(this.stickman.angle === 90)
			{
				console.log("Attempting to jump - left.");
				this.stickman.body.velocity.x = 300;
				this.stickman.body.velocity.y = 0;
			}
			/*if(firstPress[id] == true)
			{
				//Snap it to real extrapolated position based on lag.
				this.stickman.body.velocity.x += lagValue*this.stickman.body.velocity.x;
			}*/
		}
		else if(this.stickman.body.touching.right || this.stickman.body.blocked.right)
		{
			if(this.stickman.angle === -90)
			{
				console.log("Attempting to jump - right.");
				this.stickman.body.velocity.x = -300;
				this.stickman.body.velocity.y = 0;
			}
			/*if(firstPress[id] == true)
			{
				//Snap it to real extrapolated position based on lag.
				this.stickman.body.velocity.x -= lagValue*this.stickman.body.velocity.x;
			}*/
		}

	}
    
	if(this.cursor.left)
	{
		if(this.cursor.shift)
		{
			this.stickman.angle -=1;
			console.log("Decrementing angle.");
			
		}
		else
		{
			if(this.stickman.angle === 0)
			{
				this.stickman.body.velocity.x = -150;
				this.stickman.animations.play('left');
				this.facing = 'left';
			/*	if(firstPress[id] == true)
			{
				//Snap it to real extrapolated position based on lag.
				this.stickman.body.velocity.x -= lagValue*this.stickman.body.velocity.x;
			}*/
			}
			else if(this.stickman.angle === -180)
			{
				this.stickman.body.velocity.x = -150;
				this.stickman.animations.play('right');
				this.facing = 'right';
			/*	if(firstPress[id] == true)
			{
				//Snap it to real extrapolated position based on lag.
				this.stickman.body.velocity.x -= lagValue*this.stickman.body.velocity.x;
			}*/
			}
			else if(this.stickman.angle === 90)
			{
				this.stickman.body.velocity.y = -150;
				this.stickman.animations.play('left');
				this.facing = 'left';
			/*		if(firstPress[id] == true)
			{
				//Snap it to real extrapolated position based on lag.
				this.stickman.body.velocity.y -= lagValue*this.stickman.body.velocity.y;
			}*/
			}
			else if(this.stickman.angle === -90)
			{
				this.stickman.body.velocity.y = 150;
				this.stickman.animations.play('left');
				this.facing = 'right';
			/*		if(firstPress[id] == true)
			{
				//Snap it to real extrapolated position based on lag.
				this.stickman.body.velocity.y += lagValue*this.stickman.body.velocity.y;
			}*/
			}
		}
	}
	else if (this.cursor.right)
	{
		if(this.cursor.shift)
		{
			this.stickman.angle +=1;
			console.log("Decrementing angle.");
		}
		else
		{
			if(this.stickman.angle === 0)
			{
				this.stickman.body.velocity.x = 150;
				this.stickman.animations.play('right');
				this.facing = 'right';
			/*		if(firstPress[id] == true)
			{
				//Snap it to real extrapolated position based on lag.
				this.stickman.body.velocity.x += lagValue*this.stickman.body.velocity.x;
			}*/
			}
			else if(this.stickman.angle === -180)
			{
				this.stickman.body.velocity.x = 150;
				this.stickman.animations.play('left');
				this.facing = 'left';
			/*  if(firstPress[id] == true)
			{
				//Snap it to real extrapolated position based on lag.
				this.stickman.body.velocity.x += lagValue*this.stickman.body.velocity.x;
			}*/
			}
			else if(this.stickman.angle === 90)
			{
				this.stickman.body.velocity.y = 150;
				this.stickman.animations.play('right');
				this.facing = 'right';
			/*if(firstPress[id] == true)
			{
				//Snap it to real extrapolated position based on lag.
				this.stickman.body.velocity.y += lagValue*this.stickman.body.velocity.y;
			}*/
			}
			else if(this.stickman.angle === -90)
			{
				this.stickman.body.velocity.y = -150;
				this.stickman.animations.play('right');
				this.facing = 'right';
			/*	if(firstPress[id] == true)
			{
				//Snap it to real extrapolated position based on lag.
				this.stickman.body.velocity.y -= lagValue*this.stickman.body.velocity.y;
			}*/
			}	
		}
	}
	else
	{
		this.stickman.frame = 4;
		this.stickman.animations.stop();
		if(this.stickman.angle === 0 || this.stickman.angle === -180)
		{
			this.stickman.body.velocity.x = 0;
		}
		else if(this.stickman.angle === 90 || this.stickman.angle === -90)
		{
			this.stickman.body.velocity.y = 0;
		}
		if(this.facing == 'left')
		{
		//	this.stickman.frame = 0;
		}
		else if(this.facing == 'right')
		{
		//	this.stickman.frame = 7;
		}
		else if(this.facing == 'center')
		{
			this.stickman.frame = 4;
		}
	}

	//Snap stickman to angles if in correct orientation when touching a surface.
	if(this.stickman.body.wasTouching.down || this.stickman.body.blocked.down) //Ground
		{
			if((this.stickman.angle < 45 && this.stickman.angle >= 0) ||
			   (this.stickman.angle <= 0 && this.stickman.angle >= -45))
			{
				this.stickman.angle = 0;
			}
			
		}
	else if(this.stickman.body.wasTouching.up || this.stickman.body.blocked.up)
	{
		if((this.stickman.angle >= 135) || (this.stickman.angle <= -135))
		{
			this.stickman.angle	= -180;
		}
	}
	else if(this.stickman.body.wasTouching.left || this.stickman.body.blocked.left)
	{
		if((this.stickman.angle >= 45) && (this.stickman.angle < 135))
		{
			this.stickman.angle = 90;
		}
	}
	else if(this.stickman.body.wasTouching.right || this.stickman.body.blocked.right)
	{
			if((this.stickman.angle < -45) && (this.stickman.angle >= -135))
		{
			this.stickman.angle = -90;
		}
	}
	
//Apply gravity.
     if(this.stickman.angle <= 180 && this.stickman.angle > 135 
                || this.stickman.angle < -135 && this.stickman.angle >= -180 ){
                this.stickman.body.gravity.y = -200;
                this.stickman.body.gravity.x = 0;
            } 
            
            
            //stick to the ground
            else if (this.stickman.angle < 45 && this.stickman.angle >=0
                ||this.stickman.angle < 0 && this.stickman.angle >= -45){
                this.stickman.body.gravity.y = 200;
                this.stickman.body.gravity.x = 0;
            }
        
            //stick to the left wall
            else if (this.stickman.angle <= 135 && this.stickman.angle >45){
                //console.log("angle in 45,135", curStickman.angle);
                this.stickman.body.gravity.y = 0;
                this.stickman.body.gravity.x = -400;  
            }
            
            //stick to the right wall
            else if(this.stickman.angle< -45 && this.stickman.angle >= -135){
                this.stickman.body.gravity.y = 0;
                this.stickman.body.gravity.x = 400;
            }

	if (this.cursor.fire && this.stickman.alive !== false) //Fire in the direction of the cursor position 
	{
		this.fire({x:this.cursor.tx, y:this.cursor.ty}); //Values to be sent to server include these, as part of this.input as declared in update() 
	}

	firstPress[id] = false;
     


};

StickMan.prototype.fire = function(target)
{
	console.log(this.stickman);
	console.log("Firing.");
	//Fire only when the interval calls for it
	var bulletspeed=0;
	var bullettype;
	if(!this.stickman.alive) return;
	if(!this.stickman.guntype) return;
	console.log(stickman.guntype);
	if(this.stickman.guntype == 'gun')
	{
		this.fireRate = 800;
		bulletspeed = 500;
		bullettype = 1;
	}
	else if(this.stickman.guntype == 'gun2')
	{
		this.fireRate = 1000;
		bulletspeed = 800;
		bullettype = 2;
	}
	else if(this.stickman.guntype == 'gun3')
	{
		this.fireRate = 100;
		bulletspeed = 300;
		bullettype = 1;
	}
	if(this.game.time.now > this.nextFire && this.bullets.countDead() > 0)
	{
		this.nextFire = this.game.time.now + this.fireRate;
		var bullet = this.bullets.getFirstDead();
		bullet.reset(this.stickman.x, this.stickman.y);
		bullet.rotation = this.game.physics.arcade.moveToObject(bullet, target, bulletspeed);
	}
	
};

StickMan.prototype.kill = function()
{
	this.alive = false;
	this.stickman.kill();
};

var game = new Phaser.Game(1600, 800, Phaser.AUTO, '', { preload: preload, create: startgame, update: update});


function startgame(){
    // set scale options
    
    //eurecaClientSetup();
    
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.scale.setScreenSize(true);
    
    // display images
    game.add.sprite((GAME_WIDTH-500)/2, 30, 'title');
    game.add.sprite((GAME_WIDTH)/2-500, 350,'figure');
    // add the button that will start the game
    start_button = game.add.button(GAME_WIDTH-401-200, GAME_HEIGHT-143-50, 'button-start', eurecaClientSetup, 1, 0, 2);

}

function preload(){
    // preload the loading indicator first before anything else
    game.load.image('preloaderBar', 'www/assets/loading-bar.png');
   	game.time.advancedTiming = true; 
    // set background color and preload image
    game.stage.backgroundColor = '#FFFFFF';
   
    game.load.image('title', 'www/assets/gravitaslogo.png');
    game.load.image('figure', 'www/assets/stickman.png');
    game.load.spritesheet('button-start', 'www/assets/button-start.png', 401, 143);       
    
    game.load.image('sky', 'www/assets/sky2.png');
    game.load.image('ground', 'www/assets/platform.png');
    game.load.image('gun', 'www/assets/smallgun1.png');
	game.load.image('gun2', 'www/assets/smallgun2.png');
	game.load.image('gun3', 'www/assets/smallgun3.png');
	game.load.image('gun4', 'www/assets/smallgun4.png');
	game.load.image('gun5', 'www/assets/smallgun5.png');
    game.load.image('bullet', 'www/assets/pbullet.gif');
    game.load.spritesheet('healthBar','www/assets/healthbar.png' , 32,35.2); 
    game.load.spritesheet('dude', 'www/assets/stickman288x48.png', 32, 48);
    game.load.spritesheet('dude', 'www/assets/stickman288x48.png', 32, 48); 
    
    game.load.audio('boden', ['www/assets/audio/bodenstaendig_2000_in_rock_4bit.mp3', 'www/assets/audio/bodenstaendig_2000_in_rock_4bit.ogg']);
    game.load.audio('gunshot',['www/assets/audio/gunshot.mp3', 'www/assets/audio/gunshot.ogg']);

}

function create(){
    
    
    //cursors = game.input.keyboard.createCursorKeys();
    left = game.input.keyboard.addKey(Phaser.Keyboard.A);
    right = game.input.keyboard.addKey(Phaser.Keyboard.D);
    up = game.input.keyboard.addKey(Phaser.Keyboard.W);
    down = game.input.keyboard.addKey(Phaser.Keyboard.S);
    
    
    
    //control = game.input.keyboard.addKey(Phaser.Keyboard.CONTROL);
    shift = game.input.keyboard.addKey(Phaser.Keyboard.SHIFT);

    // enable arcade physics system
    game.physics.startSystem(Phaser.Physics.ARCADE); 
    game.stage.disableVisibilityChange = true;

       
    var background = game.add.sprite(0,0,'sky');
    //  scalling background
    background.scale.set(2,2);

    //  this group will contain all stage objects
    platforms = game.add.group();

    // enable physics for any object that is created in this group
    platforms.enableBody = true;

    //  create the ground.
    var ground = platforms.create(0, game.world.height - 64, 'ground');
    // Scale it to fit the width of the game (the original sprite is 400x32 in size)
    ground.scale.setTo(4, 2);

    //  This stops it from falling away when you jump on it
    ground.body.immovable = true;

    // bottom ledge
    var ledge1 = platforms.create(600,500, 'ground');
    ledge1.scale.setTo(0.6,0.1);
    ledge1.body.immovable = true;

    // middle ledge
    var ledge2 = platforms.create(400,300, 'ground'); //x, y from left, sprite
    ledge2.scale.setTo(0.4,0.1); //Length, thickness
    ledge2.body.immovable = true;

    // top ledge
    var ledge3 = platforms.create(700, 100, 'ground');
    ledge3.scale.setTo(0.5,0.1);
    ledge3.body.immovable = true;

	var ledge4 = platforms.create(1000, 250, 'ground');
	ledge4.scale.setTo(0.1, 0.1);
	ledge4.body.immovable = true;

	var ledge5 = platforms.create(1070, 300, 'ground');
	ledge5.scale.setTo(0.1, 0.1);
	ledge5.body.immovable = true;

	var ledge6 = platforms.create(1140, 350, 'ground');
	ledge6.scale.setTo(0.1, 0.1);
	ledge6.body.immovable = true;

	var ledge7 = platforms.create(1210, 400, 'ground');
	ledge7.scale.setTo(0.1, 0.1);
	ledge7.body.immovable = true;

	var ledge8 = platforms.create(200, 420, 'ground');
	ledge8.scale.setTo(0.1, 0.1);
	ledge8.body.immovable = true;

	var ledge9 = platforms.create(50, 120, 'ground');
	ledge9.scale.setTo(0.5, 0.1);
	ledge9.body.immovable = true;

	var ledge10 = platforms.create(1200, game.world.height-150, 'ground');
	ledge10.scale.setTo(0.02, 5);
	ledge10.body.immovable = true;

	var ledge11 = platforms.create(1400, 100, 'ground');
	ledge11.scale.setTo(0.3, 0.1);
	ledge11.body.immovable = true;

	var ledge12 = platforms.create(1520, 100, 'ground');
	ledge12.scale.setTo(0.01, 5);
	ledge12.body.immovable = true;

	var ledge13 = platforms.create(1400, 200, 'ground');
	ledge13.scale.setTo(0.3, 0.1);
	ledge13.body.immovable = true;

	var ledge14 = platforms.create(500, game.world.height - 90, 'ground');
	ledge14.scale.setTo(.5, 1);
	ledge14.body.immovable = true;

	var ledge15 = platforms.create(0, 600, 'ground');
	ledge15.scale.setTo(0.3, 0.1);
	ledge15.body.immovable = true;

	var ledge16 = platforms.create(1480, 600, 'ground');
	ledge16.scale.setTo(0.3, 0.1);
	ledge16.body.immovable = true;
    
    music = game.add.audio('boden');
    music.play();
    
    shootsound = game.add.audio('gunshot');
    
    

    // player settings
    stickmanList = {};
	var randomx = game.world.randomX;
	var randomy = game.world.randomY-300;
    player = new StickMan(myId, game, stickman, randomx, randomy);
	console.log("Randomx: ", randomx);
	console.log("Randomy: ", randomy);
    stickmanList[myId] = player;
    stickman = player.stickman;
    //stickman.x = randomx;
    //stickman.y = randomy;
    bullets = player.bullets;
    guns = game.add.group();
	guns2 = game.add.group();
	guns3 = game.add.group();
    guns.enableBody = true;
	guns2.enableBody = true;
	guns3.enableBody = true;

    for (var i = 1; i < 3; i++)
    {
        var gun = guns.create(i * 250, 274, 'gun');
    }

    gun = guns2.create(1560, 634, 'gun2');
    gun = guns3.create(850, 74, 'gun3');
	gun = guns2.create(1400, 70, 'gun2');
	gun = guns.create(800, 510, 'gun');
    
    //  controls.
    //cursors = game.input.keyboard.createCursorKeys();
    //spaceBar = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
	eurecaServer.handshake(myId, stickman.x, stickman.y);
    player.snapShot();
	player.snapShot(); //Second time for lag.

    //spaceBar = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    //game.input.keyboard.addKey(Phaser.Keyboard.W);
    //game.input.keyboard.addKey(Phaser.Keyboard.S);
        
        
};


function update(){
            //Do not update if client is not ready in Eureca
        if (!ready) return;

		/**player.input.left = cursors.left.isDown;
        player.input.right = cursors.right.isDown;
        player.input.up = cursors.up.isDown;**/
    
        player.input.left = left.isDown;
        player.input.right = right.isDown;
    	player.input.up = up.isDown;

       // player.input.down = down.isDown;
        player.input.fire = game.input.activePointer.isDown;
        player.input.shift = shift.isDown;  
        player.input.tx = game.input.x+ game.camera.x;
        player.input.ty = game.input.y+ game.camera.y;
    
       game.physics.arcade.collide(stickman, platforms);
       game.physics.arcade.collide(guns, platforms);
	   game.physics.arcade.collide(guns2, platforms);
	   game.physics.arcade.collide(guns3, platforms);
    game.debug.text(game.time.fps || '--', 2, 14, "#00ff00"); 
    player.getInput(); //Get input from player.
	
        for(var i in stickmanList)
        {
            if(!stickmanList[i]) continue;
			stickmanList[i].update(i); //Update all stickmen regardless of whether alive or not.
            var curBullets = stickmanList[i].bullets;
            var curStickman = stickmanList[i].stickman;

			//For every stickman, check if their bullets collide with platform.
			game.physics.arcade.collide(curBullets, platforms, destroyBullets, null, this);
			game.physics.arcade.overlap(curStickman, guns, collectGun, null, this);
			game.physics.arcade.overlap(curStickman, guns2, collectGun, null, this);
			game.physics.arcade.overlap(curStickman, guns3, collectGun, null, this);
			game.physics.arcade.collide(curStickman, platforms);
            for(var j in stickmanList)
            {
			//Check if this curStickman hit anyone with its bullets	
                if(!stickmanList[j]) continue;
                if(j!=i)
                {   
                    var targetStickman = stickmanList[j].stickman;
                    game.physics.arcade.overlap(curBullets, targetStickman, bulletHitPlayer, null, this);
				}
            }
        }
};



function collectGun(stickmanplayer,gun){
        // Removes the gun from the screen  
    gun.kill();
	console.log(gun);
	console.log(gun.key);
	if(gun.key == 'gun')
		stickmanplayer.guntype = 'gun';
	else if(gun.key == 'gun2')
		stickmanplayer.guntype = 'gun2';
	else if(gun.key == 'gun3')
		stickmanplayer.guntype = 'gun3';
    
}  

function destroyBullets(bullets,platforms){
        bullets.kill(); 
}


function bulletHitPlayer(targetStickman, bullet){
	console.log(bullet.key);
    shootsound.play();
	if(bullet.key == 'bullet')
	{
		targetStickman.health = targetStickman.health - 10;
	}
	if(targetStickman == stickman)
	{
		console.log("I am hit!");
	}
	console.log(targetStickman.health);

    if (targetStickman.health <= 0){
        targetStickman.kill();
    }
    bullet.kill();
	
}
