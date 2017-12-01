# Writing a Tracking Loop

An ordinary search loop generally has to cycle through 360 degrees repeatedly until it finds something interesting. If you know your back is to a wall, you can cut that down to 180 degrees, and if you know you are in a corner, all the way down to 90 degrees. 
But what happens once you have acquired a target? 
If it is a moving target, then on the next turn it may move out of view.
From what we know so far, that means that you will have to go through a complete sweep of your search loop again in order to find it. 
If the search loop always starts at 0 degrees, 
and the target was last seen at an angle of 330 degrees, for example, there's going to be a lot of turret adjustments that you basically already know are most likely futile. 
They may even lead to you finding some other target, and losing focus completely.

A reasonable theory would seem to be that, if you lose sight of a target, it is still likely to be near the last place that you saw it.
So let's see how you might implement a *tracking loop* that tries to re-acquire a lost target in a small field of view centered around the last known good view angle.

First, on startup, we set our base tracking code as the `sys.agents` interrupt handler.

```
	ircall sys.agents StartTracking
	irstart
```

Then, once we have finished any other startup code (like firing up engines and setting an initial course), we eventually fall into a search loop. 
Once the search loop finds a target, the interrupt will be triggered, and we will end up at `StartTracking`:

```
StartTracking:
	log "Found them! At:" sys.aim "+" sys.agents.angle
	sys.aim = sys.aim + sys.agents.angle
	sys.agents.angle = 0
	log "Set course:" sys.aim
	sys.heading = store2 2 sys.aim
	ircontinue TrackingLoop
```

First, we bring our turret to bear on our last aim angle. 
This would be necessary if we were planning to shoot along the angle to the target, for example.
Instead of shooting, in this simple example agent, we adjust our own heading to follow the agent that we have spotted, at a fairly slow speed.
This isn't necessarily a good game strategy, but it makes it very easy to see the tracking loop at work.
Finally, we re-enable interrupts and jump to `TrackingLoop`.
Notice that we have not changed our interrupt handler, 
so once we reacquire our target, we will return to `StartTracking`, 
where we will make some small adjustment to our course and continue our slow pursuit.
That is, the tracking loop is functionally just like our main search loop.
It has just been optimized for the case where we have a good guess for where to start our search.

The tracking loop makes use of the `sys.agents.angle` to allow us to scan a region without moving the turret. Notice that we are not scanning in a complete sweep of an arc. Instead we are jumping back and forth, probing an angle that gradually increases, up to a fixed limit. 
That is, first we will check at offset 5 degrees, then -5 degrees, then 10 degrees, then -10 degrees, and so on, up to a maximum of 45 and -45 degrees.
The scan loop is thus optimized for the case where the target is not very far off our current aim.

```
TrackingLoop:
# We can't lose the target until it actually moves. So 'sync'.
# Also, this will trigger a sys.agents interrupt if the target is still
# in our sights, so we don't waste time reacquiring a target we never
# lost.
	sync
# We will search at probeAngle and -probeAngle, which will increase 
# gradually until we reacquire our target (or give up).
	probeAngle = 0
# 'step' and 'limit' are constants, really. We assign them here to make it
# easier to fiddle with the precise tuning of the tracking code.
	step = 5
	limit = 45
	log "Reacquiring..."
TrackingLoop_0:
	probeAngle = probeAngle + step
	sys.agents.angle = probeAngle
	sys.agents.angle = -1 * probeAngle
	A = probeAngle < limit
	if A TrackingLoop_0 TargetLost
```

If we reach the end of the tracking loop, then we failed to trigger an `agents` interrupt, meaning our tracking algorithm failed this time. So return to the main search loop to try again, "the old fashioned way".
In this particular example, we also stop moving when we lose our target, which helps to visualize when that happens.
