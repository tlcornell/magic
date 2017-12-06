# Agent Development Tutorial

## A Simple Agent

Here is an example of an agent that just acts as a "gun turret". 
It does not move; it just rotates its turret looking for enemies and shooting at them whenever it thinks it sees one.

```
Main:
	isAnyoneThere = sys.agents.data.dist > 0
	if isAnyoneThere DoFire		# If isAnyoneThere is not zero, jump to DoFire
	sys.aim = sys.aim + 7		# Rotate the turret 7 degrees
	jump Main
DoFire:
	sys.fire = 50				# Store 50 energy into a projectile
	jump Main
```

In this simple example, the turret angle (`sys.aim`) is used both to aim the agent's weapon and to sight enemies. You will see later that the agent's vision system can support looking in one direction while shooting in another. 

The turret angle is expressed in degrees. You can assign angles greater than 360 or less than 0 to the turret, but they will be normalized to the interval from zero up to but not including 360. So if you assign an angle the the turret and immediately read it back, you may not get exactly the angle you wrote, but it will still be equivalent.

> We add 7 to `sys.aim` to give us a coarse but quick scan of the arena
  that will still eventually cover all 360 degrees. This allows us to make a full rotation of the turret with fairly few instructions (around 50) but will still cover every angle after 7 rotations. It takes the same number of instructions (360, duh!) to check all the angles, but this way we order them differently, to give us the best chance to spot someone closer to us quickly.

Agent code is based on *three address code*, which simplifies ordinary programming languages in such a way that each individual instruction contains at most one operator. So there are no complex expressions in agent code: they must be broken down into simpler assignments.
This means that you will often be using a number of *temporary local variables* to hold the values of the different parts of complex expressions.
In the gun turret example, we must compute the value of the comparison expression `sys.enemyRange > 0` separately from the `ifnz` ("if-not-zero") expression that actually tests it.

> Three-Address Code is often used as an "intermediate language" by programming
  language compilers. Any program in the original language can be translated into a 3AC code representation, and the 3AC representation is then much easier to optimize and ultimately use to generate executable machine code. So programming in 3AC directly does not limit what you can do with your programs, but it does tend to make them longer.

### Control Flow

There are five instructions that do not manipulate data values, but instead change what instruction will be executed next. These are called *control flow* operators.

* `ifnz`: Read "if not zero". Takes a value in its first argument and, 
  if it is not zero, jumps to the address (usually a label) in its second argument. If the value is zero, and there is a third argument, then control will be transferred to the address in the third argument. Otherwise control will be passed to the next sequential instruction, as usual.
  The short form `if` can also be used. It is just an alias for `ifnz`.
* `ifz`: Read "if zero". Basically the opposite of `ifnz`. Anything that can 
  be written with `ifz` can be written with `ifnz` by negating the condition,
  but in some cases using `ifz` can save you the instructions needed to perform that negation.
* `jump`: Unconditional transfer of control to the address in its first 
  argument.
* `call`: Call a function. The address of the function is the first argument
  to `call`. All further arguments are interpreted as arguments to the function,
  and can be accessed within the function using variables of the form `args.1`,
  `args.2`, etc.
* `return`: Return from a function call. Transfers control to the instruction
  immediately following the `call` instruction. The `return` instruction can take an argument, which will be interpreted as the value of the `call` expression.

Control flow can also be affected by *interrupts*, but that is considered a more advanced topic, and will be covered later.

```
# for i = 0 to 10 do ...
	I = 0
Loop:
	timeToGo = I == 10
	if timeToGo LoopExit
	#
	# do ...
	#
	I = I + 1
	jump Loop
LoopExit:
	# after loop...
```

## Why the Low Level Syntax?

MAGIC allows the creation of agents with varying *CPU speeds*. 
This governs how fast an agent can think and react to its environment,
thus making it both smarter and more agile, 
at the cost of points that could have been spent on raw power or defense.

"CPU speed" needs to be based on something in order to be meaningful. 
In MAGIC, it is expressed as *instructions per chronon*, where a "chronon" is an abstract time unit normally equivalent to a single animation frame.
*But what counts as an instruction?*
In MAGIC, agent behavior is coded in a rather low level programming language. 
It is not quite machine language or assembly language, but it is pretty close.
But the syntax is so simple that it is easy to isolate single instructions, 
and to count them (so you know how much time you have to get your attack launched, for example).

Agent code is based on *three-address code* (in case you want something to Google). 
This is a kind of code that is mainly used in compilers as an intermediate representation of a program before translation to pure native code.
As such, the individual operators that are the backbone of each instruction should be fairly familiar from higher level programming languages, 
but because you can only use a single operation per instruction, 
the complexity of the code is reduced, and it is quite easy to tell how many instructions you have until the next chronon break.

> Technical Note: If we used something closer to realistic machine code,
  like Assembly Language, then we would need separate instructions to load data from memory and store data to memory. This seemed like it would add a layer of tediousness to agent control programs, so we have sacrificed some realism instead.

