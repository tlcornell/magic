MAGIC: Metaprogram for Agent Generation, Integration, and Control

Yeah, yeah, an acronym in search of an implementation, for sure.

1. Install [Node.js and NPM](https://nodejs.org)
2. Go to your MAGIC directory
3. Run `npm install`
4. Run `node server/server.js`
5. Point your browser at [http://localhost:3000](http://localhost:3000)

The long-term goal of this project is to develop a flexible platform for
developing *programming games*. By which I mean games where the "players" are controlled by computer programs, and the human participants are more like 
*coaches*, who have to sit on the sidelines and view with satisfaction or despair the results of all their wisdom and training.

Though 'playable', in some sense, this project is not yet even alpha, 
and if you came across it somehow, that's your fault and none of my own.
Nonetheless, if you do clone it, and run `npm install` to install its 
dependencies (just [Matter.js](https://github.com/liabru/matter-js/wiki/Getting-started), right now), then you can select some 
crazed test subjects, boot them into the aren*(ahem)*laboratory and turn them loose.

The inspiration for all this is an old Macintosh programming game called
`RoboWar`. It still exists! But mainly in the form of a Windows port:
[Robowar 5](http://robowar.sourceforge.net/RoboWar5/index.html).
There is also a JavaScript port: (JSRoboWar)[https://github.com/statico/jsrobowar]. You can go there and get a quick idea of what the original was like.

But this is *not* `RoboWar`, even though the only variety of game available on the MAGIC platform is indeed the same sort of "Six weaponized roombas in a very small room" scenario.
For one thing, the programming language (still extremely primitive) is based on Three-Address Code rather than being Stack Based. (For reference, the JVM is stack based, but the Lua VM is 3AC based now. But nobody has to actually program in either language, so the reasons for choosing one over another are not really relevant here.) 


## Why use such a low level scripting language?

One feature of the MAGIC platform is that it can support agents with varying levels of mental and physical agility. This is done by limiting the number of script instructions that an agent can execute per frame.
So the game has to be able to count instructions. But more importantly *the player* needs to be able to count instructions, so they can reasonably predict how many turns it will take for their agent to execute the desired behavior. Also the opportunities for optimization are much greater at a low level.

It is quite possible that, at some future date, a higher-level language will be introduced, to allow more complex behaviors, at the cost of detailed control and the ability to squeeze more instructions into a turn. Everything is a tradeoff between leverage and control, and there will surely be advantages in trading control for leverage. But ultimately instructions will always be counted in the low level *virtual machine language*, so some version of that has to be developed first.


## There's physics

For another thing, this platform sports a *physics engine* (currently [Matter.js](https://github.com/liabru/matter-js/wiki/Getting-started)), so you can get knocked around by collisions and bullet impacts. So where you were last turn is no guarantee that you are still there this turn...

