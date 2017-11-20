# Module: Navigation

## Description

The navigation module is mainly concerned with agent movement and location.
It supports two main interfaces: a *vector-based* interface, and an *angle-based* interface. The vector interface, via the `velocity` registers, allows you to control speed and direction via *x* and *y* components.
The angle-based (or "polar") interface allows you to control speed and direction more directly, via an angle and a speed magnitude.

Speed is always expressed in *pixels per chronon*.
Angles are always in *degrees*.

## Registers

`sys.velocity.dx` (r/w) Set or get the X-axis component of the current velocity vector.

`sys.velocity.dy` (r/w) Set or get the Y-axis component of the current velocity vector.

`sys.velocity` (w) Use with a `store2` instruction to set both components of the velocity vector at once from two arguments, representing the X and Y components of the desired velocity vector, respectively.

`sys.heading` (w) Use with a `store2` instruction to set the velocity vector from a desired angle and speed. 
The first argument is the *radius* (the desired speed) and the second is the *azimuth* (the desired angle, in degrees).

`sys.heading.r` (r/w) Set or get the current speed, that is, the magnitude of the current velocity vector.

`sys.heading.th` (r/w) Set or get the current angle of the velocity vector. Remember that all angles are expressed in degrees.

`sys.x` (r) The X coordinate of the current location of this agent.

`sys.y` (r) The Y coordinate of the current location of this agent.

## Energy Cost

The energy cost for changing direction is just the sum of the change in the X component and the change in the Y component. Changes to heading are always converted to vectors before energy cost is assessed.

## Interrupts

There are no interrupts associated with the Navigation module.



## Examples

```
ArriveEastWall:
	sys.velocity.dx = 0
```

```
Startup:
	HeadingAngle = sys.random * 360
	store2 sys.heading 5 HeadingAngle
```
