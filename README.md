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

For another thing, this platform sports a *physics engine* (currently [Matter.js](https://github.com/liabru/matter-js/wiki/Getting-started)), so you can get knocked around by collisions and bullet impacts. So where you were last turn is no guarantee that you are still there this turn...

