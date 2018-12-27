var debug = false;

// IDEAS
/*

1. Asset loader
2. Procedural rocks/trees etc?
3. Fix particles
4. Blood pool on death
5. More tricks?


*/

function to_deg(rad)
{
    return (rad * 180.0) / (Math.PI * 2.0);
}

var Player = function()
{
    this.x = 0;
    this.y = 0;

    this.width = 20;
    this.height = 20;

    this.dx = 0;
    this.dy = 0;

    this.hvel = 0;

    this.image = new Image();
    this.image.src = "player.png"

    this.angle = 0;
    this.jumping = false;
    this.spin = 0;

    this.particles = [];

    this.reset_particle = function(part)
    {
        part.x = this.x;
        part.y = this.y;
        part.dx = (this.dx - (Math.random() * 9) - 3);
        part.dy = (this.dy * -1) - this.dy; 
        part.life = 25 + (Math.random() * 25)  ;
    }

    for (var i = 0; i != 100; ++i)
    {
        var part = {};
        this.reset_particle(part);
        this.particles.push(part);
    }
}

Player.prototype.update = function(rel)
{
    //if (this.dead)
    //    return;

    this.dy += (0.6 * rel);

    this.x += (this.dx * rel);
    this.y += (this.dy * rel);

    for (var i = 0; i < this.particles.length; ++i)
    {
        var p = this.particles[i];
        p.life -= (4 * rel);
        if (p.life < 0 && this.dx > 5 && !this.jumping)
        {
            this.reset_particle(p);
        }
        else
        {
            p.x += p.dx * rel;
            p.y += p.dy * rel;
            p.dy += 0.3;
        }
    }
}

Player.prototype.draw = function(ctx)
{
    for (var i = 0; i != this.particles.length; ++i)
    {
        var p = this.particles[i];
        if (p.life < 0)
            continue;

        var snowVal = 255; //Math.min(155 + Math.floor(Math.random() * 100), 255);
        ctx.fillStyle = "rgb(" + snowVal + "," + snowVal + "," + snowVal + ")";
        if (this.dead)
            ctx.fillStyle = "#F00";

        var sx = Math.random() * 4;
        ctx.fillRect(p.x, p.y, sx, sx);
    }

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    //ctx.fillStyle = this.jumping ? "rgb(0,0,255)" : "rgb(0,0,0)";
    //ctx.fillRect(-10, -10, 20, 20);
    //ctx.strokeRect(-10, -10, 20, 20);

    ctx.rotate(this.angle);
    ctx.drawImage(this.image, -10, this.dead ? -35 : -10);

    //ctx.fillStyle = this.jumping ? "rgb(0,0,255)" : "rgb(0,0,0)";
    //ctx.fillRect(-10, -10, 20, 20);
    //ctx.strokeRect(-10, -10, 20, 20);
    // ctx.beginPath();
    // ctx.moveTo(0,0);
    // ctx.lineTo(this.dx, this.dy);
    // ctx.stroke();

    ctx.restore();
}

Player.prototype.setTarget = function(x)
{
    if (this.x < x || this.x > x)
        this.dx = (x - this.x) * 0.005;
    else
        this.dx = 0;
}

Player.prototype.jump = function(x)
{
    if (this.dead)
        return;

    if (!this.jumping)
        this.dy -= 17;

    this.jumping = true;
}

function load_image(src)
{
    var image = new Image();
    image.src = src;
    return image;
}

function select_random(items)
{
    return items[Math.floor(Math.random() * items.length)];
}

var Tree_images = [
    load_image("tree_1.png"),
    load_image("tree_2.png"),
    load_image("tree_3.png"),
    load_image("rock_1.png"),
    load_image("rock_2.png")
];

function Tree(x, y)
{
    this.x = x;
    this.y = y;

    this.image = select_random(Tree_images);
}

Tree.prototype.draw = function(ctx)
{
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.drawImage(this.image, 0, 0);
    ctx.restore();
}


function collison(bodyA, bodyB)
{
    var AminX = bodyA.x;
    var AminY = bodyA.y;
    var AmaxX = bodyA.x + bodyA.width;
    var AmaxY = bodyA.y + bodyA.height;

    var BminX = bodyB.x;
    var BminY = bodyB.y;
    var BmaxX = bodyB.x + bodyB.width;
    var BmaxY = bodyB.y + bodyB.height;

    if (AmaxX < BminX ||
        AmaxY < BminY ||
        AminX > BmaxX ||
        AminY > BmaxY) {
        return false;
    }

    return true;
}

function World(width, height)
{
    this.width = width;
    this.height = height;
}

var Boaty = (function() {
    var canvas = null;
    var ctx = null;

    var updateInterval = null;
    var drawInterval = null;

    var player = new Player();
    var world = null;
    
    var perlin_terra = new PerlinNoise(Math.random());
    var perlin_stuff = new PerlinNoise(Math.random());

    var mx = 0;
    var my = 0;

    var worldX = 0;
    var worldDx = 4;

    var score = 0;

    var keyStatus = {};

    var trees = [];
    for (var i = 0; i < 100; ++i)
        trees.push(new Tree(-1000, -1000));

    function xy_offset(x, rx)
    {
        //if (Math.random() < 0.01)
        //    console.log(rx);

        //return 400 + (rx / 2); // flat slope

        return 200 + (100 * perlin_terra.perlin2((x) / 200, (400/100))) + (rx / 1.7);

        //return 400 + (Math.cos(x / 100) * 100);
    }

    player.y = xy_offset(0, 500)
    
    function last(arr)
    {
        return arr[arr.length - 1];
    }

    function hw()
    {
        return Math.floor(world.width / 2.0);
    }

    function update(rel)
    {
        //fixed cam on player?
        //worldX += (worldDx * rel);
        
        player.update(rel);

        if (!player.jumping && !player.dead)
        {
            if (keyStatus["d"])
                player.dx = Math.max(player.dx, 5);
            if (keyStatus["a"])
                player.dx = Math.min(player.dx, -5);
            if (keyStatus["s"])
                player.dx = 0;
        }
        else if (!player.dead)
        {
            if (keyStatus["d"])
            {
                player.angle += 0.1;
                player.spin += 0.1;
            }
            if (keyStatus["a"])
            {
                player.angle -= 0.1;
                player.spin += 0.1;
            }

            if (player.angle > Math.PI)
                player.angle = -Math.PI;

            if (player.angle < -Math.PI)
                player.angle = Math.PI;
        }

        if (player.y >= xy_offset(player.x, hw()))
        {
            player.y = xy_offset(player.x, hw());
            player.dy = 0;

            fx = player.x + 1;
            fy = xy_offset(fx, hw() + 1);
    
            bx = player.x - 1;
            by = xy_offset(bx, hw() - 1);
            
            var dfx = fx - bx;
            var dfy = fy - by;
    
            if (player.hvel != 0)
                player.dx = (player.hvel * 4);

            var newAngle = Math.atan(dfy/dfx);
            
            if (player.jumping && Math.abs(player.angle - newAngle) > 1)
            {
                player.dead = true;
                console.log("player = ", to_deg(player.angle), "ground = ",  to_deg(newAngle));
                console.log("delta = ", to_deg(Math.abs(player.angle - newAngle)), " limit = ", to_deg(1));
            }

            
            //TODO refactor this large block out
               
            if (player.dead)
            {
                player.dx += (1 * Math.sin(newAngle));
                player.dy += (1 * Math.cos(newAngle));
                
                player.dx *= 0.7;
                player.dy *= 0.7;
            }
            else
            {
                player.angle = newAngle;

                player.dx += (4 * Math.sin(player.angle));
                player.dy += (4 * Math.cos(player.angle));
    
                player.dx *= 0.92;
                player.dy *= 0.9;
    
                if (/*!player.dead &&*/ player.dx > 2)
                    score += (worldX / 100) * player.spin * player.dx;
            }

            player.jumping = false;
            player.spin = 0;
        }

        //player.dx = Math.min(player.dx, 20);

        draw();
    }

    function hheight()
    {
        return Math.floor(world.height / 2);
    }

    function draw()
    {
        ctx.clearRect(worldX, 0, world.width, world.height);

        ctx.translate((worldX - player.x) + (world.width / 2), 0);
        worldX = (player.x - (world.width / 2));

        //ctx.strokeRect(-5, -5, 10, 10);
        //draw world

        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.moveTo(worldX - 1, 500);
        for (var i = worldX; i < (worldX + world.width + 20); i += 4)
            ctx.lineTo(i, xy_offset(i, i - worldX));
        ctx.lineTo(worldX + world.width + 20, world.height);
        ctx.lineTo(worldX - 1, world.height);
        ctx.fill();

        player.draw(ctx);

        // ctx.beginPath();
        // ctx.moveTo(worldX - 1, 500);
        // for (var i = worldX; i < (worldX + world.width + 20); i += 40)
        // {
        //     ctx.lineTo(i, xy_offset(i, i - worldX));
        //     ctx.lineTo(i, world.height);
        // }
        // ctx.lineTo(worldX + world.width + 20, world.height);
        // ctx.lineTo(worldX - 1, world.height);
        // ctx.stroke();

        //ctx.strokeRect(worldX + 500, 500, 10, 10);

        // ctx.fillStyle = "#F00";
        // ctx.fillRect(1000, 500, 10, 10);

        var ti = 0;
        for (var i = (Math.floor(worldX / 100) * 100) - 100; i < (worldX + world.width + 20);)
        {
            i += 100;
            ti += 1;

            var ymin = xy_offset(i, i - worldX);
            var psval = perlin_stuff.perlin2(i/400, 1/400);

            ymin += (Math.abs(psval) * 1000);
            
            //ctx.fillStyle = "#000";
            //ctx.fillText(i.toFixed(0), i, ymin - 20);

            // ctx.fillStyle = (Math.floor(i) % 3 == 0) ? "#F00" : "#00F";
            // ctx.fillRect(i, ymin, 10, 10);

            var tr = trees[Math.floor(i/100) % 100];
            if (!tr)
                continue;
            tr.x = i;
            tr.y = ymin;
            tr.draw(ctx);
        }



        if (debug)
        {
            fx = player.x + 10;
            fy = xy_offset(fx);
    
            bx = player.x - 10;
            by = xy_offset(bx);
            
            var dfx = fx - bx;
            var dfy = fy - by;
    
            if (dfy < 0)
            {
                dfy *= -1;
                dfx *= -1;
            }

            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(player.x + dfx, player.y + dfy);
            ctx.stroke();

            ctx.strokeStyle = "#F00";

            ctx.beginPath();
            ctx.moveTo(fx, fy);
            ctx.lineTo(bx, by);
            ctx.stroke();

            ctx.strokeStyle = "#000";
        }

        //ctx.save();
        ctx.font = "18px Courier New";
        ctx.fillStyle = "#000";
        ctx.fillText("Score   " + score.toFixed(0), worldX + 5, 20);

        if (debug)
        {
            ctx.fillText("Player DX     " + player.dx.toFixed(2),    worldX + 5, 60);
            ctx.fillText("World X       " + worldX.toFixed(2),       worldX + 5, 80);
            ctx.fillText("Player Spin   " + player.spin.toFixed(2), worldX + 5, 100);

            var deg = (player.angle * 180) / (2 * Math.PI);
            ctx.fillText("Player Angle  " + deg.toFixed(2), worldX + 5, 120);
        }
        

        // ctx.beginPath();
        // ctx.moveTo(worldX, 500);
        // ctx.lineTo(worldX + world.width, 500);
        // ctx.stroke();

        //ctx.restore();
    }

    var running = true;
    
    return {
        init : function(canvasIn)
        {
            canvas = canvasIn;
            ctx = canvas.getContext('2d');

            world = new World();
            world.width = canvas.width;
            world.height = canvas.height;

            canvas.addEventListener("mousedown", function()
            {
                player.x = mx;
                player.y = my;
                player.dx = 0;
                player.dy = 0;
                player.dead = false;
            });

            window.addEventListener("mousemove", function(event)
            {
                mx = event.pageX - canvas.offsetLeft;
                my = event.pageY - canvas.offsetTop;
            });

            canvas.addEventListener("keydown", function(event)
            {
                if (event.key == "p")
                {
                    if (running)
                        stop();
                    else
                        start();
                }
                else if (event.key == "m")
                {
                    debug = !debug;
                }
                else if (event.key == " ")
                {
                    player.jump();
                }
                else if (event.key == "l")
                {
                }
                
                keyStatus[event.key] = true;

                //console.log(event);
            });

            canvas.addEventListener("keyup", function(event)
            {
                keyStatus[event.key] = false;
            });

        },
        start : function()
        {
            var fps = 120;
            var frameInterval = 1000 / fps;
            var relUpdate = 60 / fps;

            clearInterval(updateInterval);
            var delta = new Date();
            updateInterval = setInterval(function()
            {
                var now = new Date();
                var timeRel = (now - delta) / frameInterval;
                update(relUpdate * timeRel);
                delta = now;
            }, frameInterval);

            //clearInterval(drawInterval);
            //drawInterval = setInterval(draw, 7);

            running = true;
        },

        stop : function()
        {
            running = false;
            clearInterval(updateInterval);
            //clearInterval(drawInterval);
        },

        reset : function()
        {
            //draw();
        }
    };
  
})();
  
