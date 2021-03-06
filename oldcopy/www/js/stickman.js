
var ready = false;
var eurecaServer;
//this function will handle client communication with the server
var eurecaClientSetup = function() {
	//create an instance of eureca.io client
	var eurecaClient = new Eureca.Client();
	
	eurecaClient.ready(function (proxy) {		
        eurecaServer = proxy;
		create();
		ready = true;
	});	
} 

//var game = new Phaser.Game(1600, 800, Phaser.AUTO, '', { preload: preload, create: create, update: update });

//to Set up eurecaclient
var game = new Phaser.Game(1600, 800, Phaser.AUTO, '', { preload: preload, create: eurecaClientSetup, update: update});

function preload() {

   /**
    game.load.image('sky', 'assets/sky2.png');
    game.load.image('ground', 'assets/platform.png');
    game.load.image('gun', 'assets/smalltempgun.png');
    game.load.image('bullet', 'assets/pbullet.gif');
    game.load.spritesheet('dude', 'assets/dude.png', 32, 48); 
    **/
    
    game.load.image('sky', 'www/assets/sky2.png');
    game.load.image('ground', 'www/assets/platform.png');
    game.load.image('gun', 'www/assets/smalltempgun.png');
    game.load.image('bullet', 'www/assets/pbullet.gif');
    game.load.spritesheet('dude', 'www/assets/dude.png', 32, 48); 
    

}
    
var player;
var platforms;
var cursors;
var facing;


var guns;    
var hasGun = 0;
    
var bullet;    
var bullets;
var bulletTime = 0;


var myId = 0;


function create() {
    
    //  enable arcade physics system
    game.physics.startSystem(Phaser.Physics.ARCADE);
    
    //background for game
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
    var ledge = platforms.create(800,500, 'ground');
    ledge.scale.setTo(2,1);
    ledge.body.immovable = true;
    
    // middle ledge
    var ledge = platforms.create(0,300, 'ground');
    ledge.scale.setTo(2.5,1);
    ledge.body.immovable = true;
    
    // top ledge
    var ledge = platforms.create(800, 100, 'ground');
    ledge.scale.setTo(2,1);
    ledge.body.immovable = true;
    
    // player settings
    player = game.add.sprite(32, game.world.height - 150, 'dude');

    // enable physics on player
    game.physics.arcade.enable(player);
    
    // player properties
    player.body.bounce.y = 0.2;
    player.body.gravity.y = 200;
    player.body.collideWorldBounds = true;

    // walking right or left
    player.animations.add('left', [0, 1, 2, 3], 10, true);
    player.animations.add('right', [5, 6, 7, 8], 10, true);


    //guns
    guns = game.add.group();


    guns.enableBody = true;


    for (var i = 0; i < 4; i++)
    {
        var gun = guns.create(i * 250, 277, 'gun');
    }
    
    gun = guns.create(1200, 475, 'gun');
    gun = guns.create(850, 77, 'gun');
    
    //bullets
    bullets = game.add.group();
    //game.physics.enable(bullets,Phaser.Physics.ARCADE);
    bullets.enableBody = true;
    bullets.physicsBodyType = Phaser.Physics.ARCADE;
    //bullets.createMultiple(30, 'bullet', 0, false);
    bullets.setAll('anchor.x', 0.5);
    bullets.setAll('anchor.y', 0.5);
    bullets.setAll('outOfBoundsKill', true);
    bullets.setAll('checkWorldBounds', true);

    
    //  controls.
    cursors = game.input.keyboard.createCursorKeys();
    spaceBar = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    
    
}

function update() {
    
    //Do not update if client is not ready in Eureca
    if (!ready) return;
    
    game.physics.arcade.collide(player, platforms);
    game.physics.arcade.collide(guns, platforms);
    player.body.velocity.x = 0;

     //  Checks to see if the player overlaps with any of the guns, if he does call the collectGun function
    game.physics.arcade.overlap(player, guns, collectGun, null, this);

    if (cursors.left.isDown)
    {
        //  Move to the left
        player.body.velocity.x = -150;

        player.animations.play('left');
        facing = 'left';
        
        //run and shoot
        if(spaceBar.isDown)
        {
            //shoot 
            fireBullet();
        }
    }
    else if (cursors.right.isDown)
    {
        //  Move to the right
        player.body.velocity.x = 150;

        player.animations.play('right');
        facing = 'right';
        
        //run and shoot
        if(spaceBar.isDown)
        {
            //shoot 
            fireBullet();
        }
    }
    else if(spaceBar.isDown)
    {
        //shoot 
        fireBullet();
    
    }
    
    else
    {
        //  Stand still
        player.animations.stop();
        if (facing == 'left'){
            player.frame = 0;
        }
        else{
            player.frame = 7;
        }
    }
    
    //  Allow the player to jump if they are touching the ground.
    if (cursors.up.isDown && player.body.touching.down)
    {
        player.body.velocity.y = -350;
    }
    
}

function collectGun (player, gun) {
    
    // Removes the gun from the screen
    
    gun.kill();
    hasGun = 1;


}

function fireBullet () {
    // Ensure that player has a gun before he is able to shoot  
    // To avoid players being allowed to fire too fast a time limit is set
    if(hasGun == 1){
        if (game.time.now > bulletTime)
        {
            //  Grab the first bullet we can from the pool
            //bullet = bullets.getFirstExists(false);
            if (facing == 'right')
            {
                bullet = bullets.create(player.x+20, player.y+20, 'bullet');
                bullet.body.velocity.x = 400;
            bulletTime = game.time.now + 200;
            }
            
            if (facing == 'left')
            {
                bullet = bullets.create(player.x-20, player.y+20, 'bullet');
                bullet.body.velocity.x = -400;
            bulletTime = game.time.now + 200;
            }
        }
    }
}


function bulletHitPlayer(player, bullet){
    bullet.kill();
}
