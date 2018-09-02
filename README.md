# RockPaperScissor
RockPaperScissor excercise projects

### Requirements
- Alice and Bob play the classic rock paper scissors game.
- to enrol, each player needs to deposit the right Ether amount, possibly zero.
- to play, each player submits their unique move.
- the contract decides and rewards the winner with all Ether wagered.

Stretch goals:

- make it a utility whereby any 2 people can decide to play against each other.
- reduce gas costs as much as you can.
- let players bet their previous winnings.
- how can you entice players to play, knowing that they may have their funding stuck in the contract 
      if they faced an uncooperative player?

### Hypothesis:
- each player should bet some ether on its victory
- the game foreseen a minimum and a maximum amount for betting
- if  minumum is zero then also maximum must be zero (theiy paly just for fun)
- otherwise each player must bet a value beetwen min and max to play
- who wants play should hash its move with makeMoveHash prividing a secret and the move
- who wants challenge another player is the first *player* and should 
    1. makes an hash game prividing the opponent address
    2. starts the game calling play (a game timeout is foreseen)
    3. sends the game hash to his opponent (the second *player*)
- the second player calls raise providing the game hash, its bet as hash and its wager
- when both player have played its is possible to reveal the bet (no matter the order)
- when both bet have been revealed the game checks the result and choose the winner (if any)
- the winner wins all wagers (in contract balances)
- if there is no winner, every player will receive its wager in balance 
- the first player can claim the game when its timeout is expired (to protect from uncoperative opponent)

### Added:


### Pending
- wager should be inserted in log?
- how let player bet the previous winning? It could be sending no value when he plays....
- the NO_MOVE could be used to pass (and lose eth?)
- overloading functions seems not working in js tests (Error: Invalid number of arguments to Solidity function) so used different names
  so I needed to use different names (I whould prefer to use just play())
- rerturnig the hash game in logs is the right way? It keeps simple the playing steps....
- change min/max wager?
- several tests....
- ensure accounts have enough ethers for tests

### Missings 
- UI

### Other
