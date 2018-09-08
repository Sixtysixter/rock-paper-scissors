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
- who wants play should hash its move with makeMoveHash prividing a secret and the move
- its wager is the game cost and the second player must provide the same amount
- who wants challenge another player is the first *player* and should 
    1. build its own  hash game
    2. starts the game calling play (a game timeout is foreseen) and its hasn move
    3. sends the game hash to his opponent (the second *player*)
- the second player calls raise providing the game hash, its move and its wager
- then the first player can reveal its move and the game choose the winner (if any)
- the winner wins all wagers (in contract balances)
- if there is no winner, every player will receive its wager in balance 
- the first player can claim the game when its timeout is expired (to protect from uncoperative opponent)

### Added:


### Pending
- the NO_MOVE could be used to pass (and lose eth?)
- overloading functions seems not working in js tests (Error: Invalid number of arguments to Solidity function) so used different names
  so I needed to use different names (I whould prefer to use just play())
- several tests....
- ensure accounts have enough ethers for tests

### Missings 
- UI

### Other
