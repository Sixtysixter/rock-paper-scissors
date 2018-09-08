pragma solidity ^0.4.24;

contract RockPaperScissor {
    enum WINNER {NONE, FIRST, SECOND}
    enum MOVE {NONE, ROCK, PAPER, SCISSORS}

    struct Game {
        bytes32    moveHash; // the player 1 move hash
        address    player1;
        MOVE       move;     // the player 2 move
        address    player2;
        uint256    wager;
        uint256    expiringBlock;
    }

    mapping(bytes32 => Game)    public games;
    mapping(address => uint256) public balances;

    event LogCreation(address indexed owner);

    event LogGameStarted(bytes32 indexed gameHash, address indexed player, uint256 indexed wager, bytes32 moveHash, uint256 expiringBlock);
    event LogGameEnded(bytes32 indexed gameHash, address indexed player, MOVE move);

    event LogNoWinner(bytes32 indexed gameHash, address indexed firstPlayer, address indexed secondPlayer, MOVE move);
    event LogWinnerIs(bytes32 indexed gameHash, address indexed winner, MOVE winnerMove, address indexed looser, MOVE looserMove);

    event LogClaim(bytes32 indexed gameHash, address indexed player,  uint256 indexed wager);
    event LogWithdraw(address indexed player, uint256 indexed amount);

    constructor() public {
        emit LogCreation(msg.sender);
    }

    function play(bytes32 gameHash, bytes32 moveHash, uint256 timeout) public payable returns (bool success) {
        require(moveHash != 0, "play: invalid move");
        require(timeout > 0, "play: invalid timeout");

        Game storage game = games[gameHash];

        require(game.player1 == address(0), "play: player alreday played as player 1");

        game.player1       = msg.sender;
        game.wager         = msg.value;
        game.moveHash      = moveHash;
        game.expiringBlock = block.number + timeout;

        // emit LogGameStarted(gameHash, msg.sender);
        emit LogGameStarted(gameHash, msg.sender, msg.value, moveHash, game.expiringBlock);
        
        return true;
    }

    function raise(bytes32 gameHash, MOVE move) public payable returns (bool success) {
        require(gameHash != 0, "raise: invalid gameHash");
        require(MOVE.NONE < move && move <= MOVE.SCISSORS, "raise: invalid move");

        Game storage game = games[gameHash];
        require(game.wager == msg.value, "raise: wager out of range");
        require(game.player1 != address(0), "raise: game not started yet");
        require(game.player2 == address(0), "raise: game already ended");

        game.player2 = msg.sender;
        game.wager   = msg.value * 2;
        game.move    = move;

        emit LogGameEnded(gameHash, msg.sender, move);
        
        return true;
    }

    function reveal(bytes32 gameHash, bytes32 secret, MOVE move) public returns (bool success) {
        require(gameHash != 0, "reveal: invalid gameHash");
        require(secret != 0, "reveal: invalid secret");
        require(MOVE.NONE < move && move <= MOVE.SCISSORS, "reveal: invalid move");

        Game storage game = games[gameHash];

        require(game.player1 == msg.sender, "reveal: only player 1 can reveal its move");

        bytes32 moveHash = makeMoveHash(secret, MOVE(move));

        require(game.moveHash == moveHash, "reveal: invalid move or secret");

        WINNER winner = evaluateWinner(game, move);
        if (winner == WINNER.NONE) {
            balances[game.player1] += game.wager / 2;
            balances[game.player2] += game.wager / 2;
            emit LogNoWinner(gameHash, game.player1, game.player2, game.move);
        } else if (winner == WINNER.FIRST) {
            balances[game.player1] += game.wager;
            emit LogWinnerIs(gameHash, game.player1, move, game.player2, game.move);
        } else if (winner == WINNER.SECOND) {
            balances[game.player2] += game.wager;
            emit LogWinnerIs(gameHash, game.player2, game.move, game.player1, move);
        }

        resetGame(game);
        
        return true;
    }

    function withdraw() public returns (bool success) {
        uint256 amount = balances[msg.sender];

        require(amount != 0);

        balances[msg.sender] = 0;
        
        emit LogWithdraw(msg.sender, amount);

        msg.sender.transfer(amount);
        
        return true;
    }

    function claim(bytes32 gameHash) public returns (bool success) {
        require(gameHash != 0, "claim: invalid gameHash");

        Game storage game = games[gameHash];

        require(game.player1 == msg.sender, "claim: sender cannot claim this game");
        require(block.number > game.expiringBlock, "claim: game is not expired");
        require(game.player2 == address(0), "claim: player2 already played");

        balances[game.player1] += game.wager;
        
        emit LogClaim(gameHash, msg.sender, game.wager);

        resetGame(game);
        
        return true;
    }

    function makeMoveHash(bytes32 secret, MOVE move) public view returns(bytes32 moveHash) {
        return keccak256(abi.encodePacked(this, msg.sender, secret, move));
    }

    function evaluateWinner(Game storage game, MOVE move) private view returns(WINNER winner) {
        if (move == game.move) {
            winner = WINNER.NONE;
        } else if (move == MOVE.ROCK && game.move == MOVE.SCISSORS) {
            winner = WINNER.FIRST;
        } else if (move == MOVE.SCISSORS && game.move == MOVE.ROCK) {
            winner = WINNER.SECOND;
        } else { 
            winner = (move > game.move) ? WINNER.FIRST : WINNER.SECOND;
        }

        return winner;
    }

    function resetGame(Game storage game) private {
        game.moveHash = bytes32(0);
        game.player1  = 0;
        game.player2  = 0;
    }
}
