# Aiming at a Moving Target

The simplest targeting algorithm, as we've seen in the Gun Turret example, is just to spin your turret until you see something, and then to fire at it.
But projectiles in this game don't actually move that fast, so it takes some time for a shot to reach the other side of the arena. 
If your target is moving, then chances are it will be somewhere else when your attack arrives.

In this example, we upgrade our Gun Turret bot to take advantage of target data so as to be able to *lead* its shots, so that it is aiming at a spot where the target is likely to be when the shot actually arrives.

The basic Gun Turret code is the same. Only the implementation of the `DoFire` routine changes.

Originally, we just had something like the following.

```
DoFire:
	lowEnergy = sys.energy < 20
	if lowEnergy Main            # Don't bother
	sys.fire = sys.energy 		 # Dump all available energy into a bullet
	jump Main
```

In our new version, we will update the `sys.aim` register to point at where the target seems to be heading, not at where it is now.
This will involve using some new facilities of our Targets Sensor, 
and also doing some *vector math* and a little *trigonometry* (gasp!).

```
DoFire:
	lowEnergy = sys.energy < 20
	if lowEnergy Main
	pos0.x = sys.x
	pos0.y = sys.y
	pos1 = sys.agents.data.pos
```

In this code, we start by defining a local variable to hold our position. 
Observe that our local variables `pos0.x` and `pos0.y` have some structure to them. 
It is theoretically possible to now use `pos0` as a variable that denotes a *pair* of values `(pos0.x, pos0.y)`. 
Wherever we have such objects, that have components named `x` and `y`, we will refer to them as *vectors*, though in fact the programming language doesn't know anything about vectors or points or anything like that. This is just a naming convention that will help us develop routines and functions that behave in consistent ways over objects that we think of as being of the same type. 

You can see this in the next line, where we read a sensor register that returns the position of the target: `sys.agents.data.pos`. This register is actually another vector object. So after the assignment, we can now read `pos1.x` and `pos1.y` from our local `pos1` variable. Which we will do, in a minute.

```
	vObs.x = pos1.x - pos0.x
	vObs.y = pos1.y - pos0.y
```

The next thing we do is to compute a vector `vObs`, the *observation vector*, which points from us to our target. In vector terms, it is the difference between the vector (from the origin to) `pos0` and the vector (from the origin to) `pos1`.
That is, `pos1 - pos0`.
But since our interpreter does not support vector operations natively, we have to break that down according to the definition of vector subtraction, 
and compute the new vector's `x` and `y` components separately.

Next we read some more data about our target from our sensor:

```
	dist = sys.agents.data.dist		# their distance from us
	drv = sys.agents.data.drive		# their movement vector
```

We can use the `dist` value to help us figure out how long it will take for our shot to land:

```
	time = dist / 12                # bullets travel at 12 pixel/chronon
	time = round time				# num chronons until impact
```

Now we can multiply the target's drive vector by the number of chronons our bullet will take to reach them. 
That gives us the vector pointing from their current position to their next position.

```
	vMvt.x = time * drv.x
	vMvt.y = time * drv.y
	vNxt.x = vObs.x + vMvt.x
	vNxt.y = vObs.y + vMvt.y
```

Here, `vMvt` is their drive vector scaled up by the number of chronons our shot will take to reach them, 
and `vNxt` is the vector pointing from us to where they will be at the end of that travel.
Note that `vNxt` is computed relative to `vObs`, the observation vector, and not `pos1`, the actual position of the target (or, in vector terms, the vector from the origin to their observed position).
That makes our position effectively the origin for this and subsequent calculations, which is important for computing our new aim angle.

```
	aNxt = atan vNxt.y vNxt.x		# aim angle to future them
	sys.aim = aNxt
	sys.fire = sys.energy
	jump Main
```

Here we use a thinly-veiled call to JavaScript's `Math.atan2` function to compute the angle from the "x-axis" to the future position of our target.
Because we based `vNxt` off of `vObs`, that makes all coordinates relative to our position, so the "x-axis" in this case is exactly what our turret is looking at when we are pointed at zero degrees. 
So all we have to do is to plug that angle into `sys.aim`, and fire.

## Caveat #1: `time` is an approximation

Note that in our calculation of the time to shot impact, we are using the distance to the target's current position. 
Unless it is circling us, the distance to its future position will be different; maybe further away, maybe closer. 
Either way, our shot may take more or less time to reach them.
To some extent, this may not matter, since we are not aiming at a point, but rather at a 30-pixel wide target. 
It's not the broad side of a barn, but obviously we don't have to be perfectly precise to hit it.

It might also be possible to use successive approximations to reach a more accurate result. That is, recalculate `time` based on the size of `vNxt`, then recalculate `vNxt` based on the updated `time` value, rinse, and repeat. 
However, this takes time, and is probably not worth it. 

## Caveat #2: They can change direction

Obviously, we are making a big assumption that their current drive vector will remain the same for `time` chronons. If they are far away, and `time` is large, this becomes less likely, as it becomes more likely that they would hit a wall if they actually kept going the same direction for that long. 
And of course the obvious strategy, if you know you are up against an opponent that uses sophisticated shot leading logic, is to never keep going the same direction for very long. 
Of course, maneuvering takes energy, so there's limits to how tricky your opponent can be, 
but it remains important to keep in mind that this is only one strategy you might use for aiming. It works great, when it works.

## Caveat #3: Chronon breaks introduce instability

One problem with any long-ish algorithm is that chronon breaks can happen in the middle of it. That means that suddenly you move, and they move too, making sensor data obsolete.
The `sys.agents` (pseudo-) register, or the `sys.agents.data.fresh` register can be tested if you need to know how fresh your data is.

> There is a remote possibility that on a chronon break you will pick up 
  fresh data about a different target. So in the worst case you might get the X coordinate of one target and the Y coordinate of another. This is going to be pretty rare, and the only penalty is you waste a shot, so probably not something to lose sleep over.

You probably want to get sensor data into local variables as soon as possible, because local variables aren't affected by what's going on in the arena. 
The code as presented does not always do that, because I wanted to present it in a logical order, introducing new things as much as possible only when they are about to be needed.
In fact, your very first lines of code should really be:

```
	pos1 = sys.agents.data.pos
	dist = sys.agents.data.dist		# their distance from us
	drv = sys.agents.data.drive		# their movement vector
	pos0.x = sys.x
	pos0.y = sys.y
```

Even so, it is possible for a chronon break to fall somewhere in those first three lines of code.
One solution is to insert a `sync` instruction in the main loop:

```
Main:
	sys.mv.velocity = tuple 0 0
	sync
	if sys.agents DoFire KeepLooking
```

This assures that your data will stay fresh for 20 instructions (assuming max CPU speed).
However, this also means that you only get to move your turret once each chronon, which makes you very slow at spotting enemies.

We can improve this version by *unrolling* our aim loop. 

```
Main:
	sys.mv.velocity = tuple 0 0
	sync
	if sys.agents DoFire 
	sys.aim = sys.aim + 7
	if sys.agents DoFire 
	sys.aim = sys.aim + 7
	if sys.agents DoFire 
	sys.aim = sys.aim + 7
	if sys.agents DoFire 
	sys.aim = sys.aim + 7
	if sys.agents DoFire 
	sys.aim = sys.aim + 7
	if sys.agents DoFire 
	sys.aim = sys.aim + 7
	if sys.agents DoFire 
	sys.aim = sys.aim + 7
	if sys.agents DoFire 
	sys.aim = sys.aim + 7
	if sys.agents DoFire Main

DoFire:
	pos1 = sys.agents.data.pos
	dist = sys.agents.data.dist		# their distance from us
	drv = sys.agents.data.drive		# their movement vector
```

If you count from the `sync` instruction, you will see that the longest possible path from `sync` through the first part of `DoFire` is 20 instructions, which is our CPU speed. So even in the worst case, where we spot a target in the very last `if`-statement, we can make it through our critical instructions in a single chronon.

It is still possible for the data you capture so carefully will be out of date by the time you make your shot. One possible way to address that would be to add another `sync` instruction after the code above. That assures you that your data is one chronon out of date, so you can add 1 to the `time` variable to compensate.
Or you can just count on the size of the target to assure you that one chronon here or there probably won't make a whole lot of difference in the long run.

