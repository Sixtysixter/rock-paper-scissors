pragma solidity ^0.4.24;

contract RockPaperScissor {
    enum WINNER {NONE, FIRST, SECOND}
    enum MOVE {NONE, ROCK, PAPER, SCISSORS}

    struct Competitor {
        bytes32 moveHash;
        uint256 wager;
        address player;
        MOVE    move;
    }

    struct Game {
       Competitor first;
       Competitor second;
       uint256    expiringBlock;
    }

    uint256 public minWager;
    uint256 public maxWager;

    mapping(bytes32 => Game)    public games;
    mapping(address => uint256) public balances;

    event LogCreation(uint256 minWager, uint256 maxWager);

    event LogGameStarted(bytes32 indexed gameHash, address indexed player, bytes32 moveHash, uint256 expiringBlock);
    event LogGameEnded(bytes32 indexed gameHash, address indexed player, bytes32 moveHash);

    event LogNoWinner(bytes32 indexed gameHash, address indexed firstPlayer, address indexed secondPlayer, MOVE move);
    event LogWinnerIs(bytes32 indexed gameHash, address indexed winner, MOVE winnerMove, address indexed looser, MOVE looserMove);

    event LogClaim(bytes32 indexed gameHash, address indexed player,  uint256 indexed wager);
    event LogWithdraw(address indexed player, uint256 indexed amount);

    constructor(uint256 _minWager, uint256 _maxWager) public {
        require(_minWager <= _maxWager, "constructor: min wager greater than max one");
        if (_minWager == 0 && _maxWager > 0)
            revert();

        minWager = _minWager;
        maxWager = _maxWager;

        emit LogCreation(minWager, maxWager);
    }

    function play(bytes32 gameHash, bytes32 moveHash, uint256 timeout) public payable {
        require(minWager <= msg.value && msg.value <= maxWager, "play: wager out of range");
        require(moveHash != 0, "play: invalid move");
        require(timeout > 0, "play: invalid timeout");

        Game storage game = games[gameHash];

        require(game.first.player == address(0), "play: player alreday played");

        game.first.player    = msg.sender;
        game.first.wager     = msg.value;
        game.first.moveHash  = moveHash;
        game.expiringBlock   = block.number + timeout;

        // emit LogGameStarted(gameHash, msg.sender);
        emit LogGameStarted(gameHash, msg.sender, moveHash, game.expiringBlock);
    }

    function raise(bytes32 gameHash, bytes32 moveHash) public payable {
        require(gameHash != 0, "raise: invalid gameHash");
        require(minWager <= msg.value && msg.value <= maxWager, "raise: wager out of range");
        require(moveHash != 0, "raise: invalid moveHash");

        Game storage game = games[gameHash];
        require(game.first.player != address(0), "raise: game not started yet");
        require(game.second.player == address(0), "raise: game already ended");

        game.second.player   = msg.sender;
        game.second.wager    = msg.value;
        game.second.moveHash = moveHash;

        emit LogGameEnded(gameHash, msg.sender, moveHash);
    }

    function reveal(bytes32 gameHash, bytes32 secret, uint8 move) public {
        require(gameHash != 0, "reveal: invalid gameHash");
        require(secret != 0, "reveal: invalid secret");
        require(uint8(MOVE.NONE) < move && move <= uint8(MOVE.SCISSORS), "reveal: invalid move");

        Game storage game = games[gameHash];

        Competitor storage firstCompetitor  = game.first;
        Competitor storage secondCompetitor = game.second;

        require(firstCompetitor.player != address(0) || secondCompetitor.player != address(0), "reveal: some WINNER should have played");

        bytes32 moveHash = makeMoveHash(secret, move);

        if (firstCompetitor.player == msg.sender && firstCompetitor.moveHash == moveHash) {
            firstCompetitor.move = MOVE(move);
        } else if (secondCompetitor.player == msg.sender && game.second.moveHash == moveHash) {
            game.second.move = MOVE(move);
        } else {
            revert();
        }

        if (firstCompetitor.move == MOVE.NONE || secondCompetitor.move == MOVE.NONE) {
            return;
        }

        WINNER winner = evaluateWinner(game);
        if (winner == WINNER.NONE) {
            balances[firstCompetitor.player] += firstCompetitor.wager;
            balances[secondCompetitor.player] += game.second.wager;
            emit LogNoWinner(gameHash, firstCompetitor.player, secondCompetitor.player, firstCompetitor.move);
        } else if (winner == WINNER.FIRST) {
            balances[firstCompetitor.player] += firstCompetitor.wager + secondCompetitor.wager;
            emit LogWinnerIs(gameHash, firstCompetitor.player, firstCompetitor.move, secondCompetitor.player, secondCompetitor.move);
        } else if (winner == WINNER.SECOND) {
            balances[game.second.player] += firstCompetitor.wager + game.second.wager;
            emit LogWinnerIs(gameHash, secondCompetitor.player, secondCompetitor.move, firstCompetitor.player, firstCompetitor.move);
        }

        resetGame(game);
    }

    function withdraw() public {
        uint256 amount = balances[msg.sender];

        require(amount != 0);

        balances[msg.sender] = 0;
        
        emit LogWithdraw(msg.sender, amount);

        msg.sender.transfer(amount);
    }

    function claim(bytes32 gameHash) public {
        require(gameHash != 0, "claim: invalid gameHash");

        Game storage game = games[gameHash];

        Competitor storage firstCompetitor  = game.first;
        Competitor storage secondCompetitor = game.second;

        require(firstCompetitor.player == msg.sender, "claim: sender cannot claim this game");
        require(block.number > game.expiringBlock, "claim: game is not expired");
        require(secondCompetitor.player == address(0), "claim: player2 already played");

        balances[firstCompetitor.player] += firstCompetitor.wager;
        
        emit LogClaim(gameHash, msg.sender, firstCompetitor.wager);

        resetGame(game);
    }

    function makeMoveHash(bytes32 secret, uint8 move) public view returns(bytes32 moveHash) {
        return keccak256(abi.encodePacked(this, msg.sender, secret, move));
    }

    function evaluateWinner(Game storage game) private view returns(WINNER winner) {
        if (game.first.move == game.second.move) {
            winner = WINNER.NONE;
        } else if (game.first.move == MOVE.ROCK && game.second.move == MOVE.SCISSORS) {
            winner = WINNER.FIRST;
        } else if (game.first.move == MOVE.SCISSORS && game.second.move == MOVE.ROCK) {
            winner = WINNER.SECOND;
        } else { 
            winner = (game.first.move > game.second.move) ? WINNER.FIRST : WINNER.SECOND;
        }

        return winner;
    }

    function resetGame(Game storage game) private {
        delete game.first;
        delete game.second;
    }
}
