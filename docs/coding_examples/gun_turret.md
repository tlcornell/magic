# A Simple Gun Turret

`GunTurret` is an agent that stays in one place while searching the arena for targets. When it spots another agent, it fires at it with as much energy as it can spare.

This example is meant to introduce the "Agents Scanner" hardware module that agents use to scan the arena for other agents. It is their *vision system*, basically. We will elaborate it slightly in the course of this tutorial, highlighting some other general problems and how to deal with them.

The "brains" of this agent can be found in a single line:

```
Main:
	if sys.agents DoFire KeepLooking
```

What this is saying is that, if the `sys.agents` register contains a number other than zero, then branch to the location labeled `DoFire`. Otherwise, branch to the location labeled `KeepLooking`.

> `sys.agents` is actually shorthand for `sys.agents.data.dist`, 
  which always holds data about the distance to the closest agent visible at our current scanning angle. It contains zero if no agent is visible at the current angle. So we can use it to answer simpler questions, like "Can we see anything at all right now?"

In the event that another agent is visible at our current aiming angle, then we execute the following code:

```
DoFire:
	sys.fire = 30
	jump Main
```

This will request 30 energy units from our power module, and store them in a bullet. Then we return to our `Main` section to see if we should keep firing.
Note that all we can do here is *request* 30 energy. There might not be that much power in our reserves. In that case, the power module will only supply what it has, so the bullet may be considerably weaker than a 30-power shot.

> Energy is used both in firing weapons and in maneuvering. `GunTurret` 
  doesn't do much maneuvering, however, so we can assume that if we are low in energy it is because we already used it to fire a previous shot.

In the event that no target is visible at our current aim angle (`sys.agents` holds 0), then we try another aim angle:

```
KeepLooking:
	sys.aim = sys.aim + 7
	jump Main
```

We bump our angle by 7 here each time through. Then we return to `Main` to test whether anything is visible there.

You may well ask "Why 7?". There are several things to consider here.
First, "Why not 1?" The answer to that is that it would then take us several chronons to bring the turret all the way around. If the enemy is at angle 350, then we are very unlucky, and they are likely to spot us -- and start shooting! -- first.

The idea is that, if an object is near you, then it takes up more of your field of view than if it farther away (which is another way of saying "It looks bigger"). If you were looking through a telescope, and you moved your telescope to the right by some number of degrees, a nearby object is more likely than a distant object to still be in view. If an enemy is nearby, then not only are they easy for you to see, you are easy for them to see. So their targeting is going to be more reliable, and therefore you are in more danger. 
So there's two reasons to move the turret in largish increments:

* We cover all 360 degrees in fewer instructions
* Nearby enemies are still reasonably likely to be spotted 
  even by such a coarse scan

The next question, then, is "Why not 6? Or 8?". 
The reason here is that 7 is the smallest number larger than 1 that is not a divisor of 360. If we picked 6, we would never check angles like 1 or 2 or 3. 
Indeed, we would only ever check angles that are multiples of 6.
But because 7 is not a divisor of 360, we have to go through the entire circle seven times before we try the same angle over again, and all three hundred and sixty angles get checked once during that scan. 
Try experimenting with larger numbers, like 11 or 13, if you think that getting through a complete scan quickly needs to be a priority.

## Wall Damage

If you put two `GunTurrets` in the arena to fight, you will notice something interesting. Bullets (or cannonballs or energy torpedoes, or whatever you imagine they are) have momentum, and when they impact an agent, they knock it around, as well as doing damage. 

In this game, there is no friction. So even fairly light objects like bullets can set a stationary agent moving. Eventually, it will drift into a wall. Since walls do damage every turn, it will not be long before a `GunTurret` will die up against a wall.

Therefore, if you want to remain stationary, you actually have to put some effort into it. One way to do that is to add the following line to `Main`:

```
Main:
	sys.velocity = tuple 0 0
	if sys.agents DoFire KeepLooking
```

The new line assigns the pair `(0,0)` to the agent's velocity vector. 
This could also be done by writing:

```
Main:
	sys.velocity.dx = 0
	sys.velocity.dy = 0
	if sys.agents DoFire KeepLooking
```

However, that takes an extra instruction. Also, if by bad luck a chronon break occurs between the first and second instruction, then the agent will still be drifting in the Y direction for one more chronon. The `tuple` operator assures that a new course will be set in a single instruction, all at once.

With this change, you will see that bullets still knock the agents around a bit, but they recover quickly and hold their ground, and generally do not get knocked into walls unless they start the game very close to one.

## Controlling Shot Power

An agent's power module will recharge at a rate of two units per chronon.
So if, on one turn, we put all 30 of our energy units into a shot, then we will have no energy for further shots until the next chronon, and even then we will only have 2 energy units to shoot with.

So `GunTurret` tends to lead with a powerful shot, and then a long string of pretty weak shots. This might be okay, if you are pretty sure that your first shot will hit. Then it's just a matter of converting your energy into damage to your target as relentlessly as possible. However, if your target is moving, then there is a decent chance that your first shot will miss, and you will have wasted all that energy. 

One thing that we can do is to assure that we only fire when we have "enough" energy. For example, consider the following modification to `DoFire`:

```
DoFire:
	lowEnergy = sys.energy < 20
	if lowEnergy DontFire
	sys.fire = 30
	jump Main
DontFire:
	sync	# let us recharge a bit
	jump Main
```

In this case, we first check to make sure we have enough energy to make a difference. If we do not, we branch to `DontFire`. The `sync` instruction just says "skip the rest of this turn", allowing us to recharge our power supply a little bit.

