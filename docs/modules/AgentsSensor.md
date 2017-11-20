# Module: Agents Scanner

## Description

The Agents Scanner module (`sys.agents`) acts as part of the unit's *vision system*.
It gives agents the ability to detect other agents in the arena.

## Registers

`sys.agents.angle` (rw) On writing, sets the scanner angle, which is an *offset* from the main turret angle (`sys.turret.angle` or `sys.aim`). Reading returns the current scanner angle.

`sys.agents.data.dist` (r) If there is another agent in view along the current scanner angle vector, then reading this register returns the distance to that agent. If no agent is in view, returns 0. The sensitivity of this sensor can be controlled through the interrupt system, and allows the player to shorten an agent's field of view, if desired. The sensitivity parameter defaults to a value larger than the size of the arena, so other agents can be seen at any distance.

## Energy Cost

Not applicable.

## Interrupts

The `sys.agents` interrupt is associated with this scanner, and if interrupts are enabled, and the sensor sensitivity allows it, an interrupt will be raised if an agent is present along the current sensor vector.

## Examples
