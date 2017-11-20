# Module: Wall Sensors

## Description

There are five distinct but related sensor registers that can tell you about where you are in relation to the arena's walls. You can use the plain old `sys.wall` register to tell you which wall you are closest to, subject to the sensitivity setting on the sensor (so it may tell you that you are not close to any wall). Or you can use the specific `sys.wall.north`, etc., registers to tell you your distance from a specific wall.

The `sys.wall` register, when read, returns an integer value that is either:

* 0 - None
* 1 - North
* 2 - West
* 3 - South
* 4 - East

These are frequently used to compute offsets into *jump tables*, for example.
(See below in the **Examples** section.)

Note that the wall sensors are somewhat exceptional in that the sensitivity setting, which is normally reserved for managing *interrupts*, is used also in normal operation.

**Wall Damage**
Collision with a wall will cause *1 point of damage* per chronon to the colliding agent.

## Registers

All wall registers are *read only*.

`sys.wall` When read, returns a code indicating the closest wall. Possible values are:

* 0 - None
* 1 - North
* 2 - West
* 3 - South
* 4 - East

Zero will be returned if the interrupt sensitivity setting (`irparam sys.wall`) is such that distances to all walls are larger than the sensitivity setting. 
This could be taken as an indication that you are "in the clear", for example.

`sys.wall.north` When read, returns the current distance to the north wall.

`sys.wall.west` When read, returns the current distance to the west wall.

`sys.wall.south` When read, returns the current distance to the south wall.

`sys.wall.east` When read, returns the current distance to the east wall.

## Energy Cost

Not Applicable

## Interrupts

There is a single interrupt `sys.wall` associated with this sensor. 
It has a sensitivity setting, set with `irparam sys.wall <dist>`, which will trigger the interrupt with the agent's distance to any wall is less than the given distance. The interrupt sensitivity defaults to *20 pixels*.

## Examples

```
SetupInterrupts:
	ircall sys.wall ArrivedAtWall
	irparam sys.wall 30
```

```
Main:
	Address = Bounce + sys.wall 
	jump Address
Bounce:
	jump ContinueTraveling
	jump GetOffNorthWall
	jump GetOffWestWall
	jump GetOffSouthWall
	jump GetOffEastWall
```
