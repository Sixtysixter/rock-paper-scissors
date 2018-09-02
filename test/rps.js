Promise = require("bluebird");

Promise.promisifyAll(web3.eth, { suffix: "Promise" });

web3.eth.expectedExceptionPromise = require("../utils/expectedExceptionPromise.js");
web3.eth.expectedOkPromise = require("../utils/expectedOkPromise.js");

// Import the smart contracts
const RockPaperScissor = artifacts.require("./RockPaperScissor.sol");

contract('RockPaperScissor', function(accounts) {
    const MAX_GAS          = 3000000;

    const MAX_WAGER        = web3.toWei(1.000, 'ether'); 
    const MIN_WAGER        = web3.toWei(0.001, 'ether'); 

    const TO_LOW_WAGER     = web3.toWei(0.0005, 'ether'); 
    const TO_HIGH_WAGER    = web3.toWei(1.1, 'ether'); 

    const FIRST_WAGER      = web3.toWei(0.003, 'ether'); 
    const SECOND_WAGER     = web3.toWei(0.005, 'ether'); 

    const GAME_SECRET      = web3.sha3("Let's play!!");
    const FIRST_SECRET     = web3.sha3("firstPlayer");
    const SECOND_SECRET    = web3.sha3("secondPlayer");
    const UNKNOWN_SECRET   = web3.sha3("unknownPlayer");

    const LONG_TIMEOUT     = 100;
    const SHORT_TIMEOUT    = 4;

    const NO_MOVE          = 0;
    const ROCK_MOVE        = 1;
    const PAPER_MOVE       = 2;
    const SCISSORS_MOVE    = 3;
    const INVALID_MOVE     = 4;

    // console.log(accounts);
    // console.log(FIRST_HASH);
    // console.log(SECOND_HASH);

    var owner;
    var player1;
    var player2;
    var PLAYERS = [];
    before("check accounts number", function() {
        assert.isAtLeast(accounts.length, 3, "not enough accounts");
        [owner, player1, player2] = accounts;
        PLAYERS = [player1, player2];

        console.log("Player 1: " + player1);
        console.log("Player 2: " + player2);
    });

    describe("Try migration", function() {
        var instance;
        before("should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new(MIN_WAGER, MAX_WAGER, { from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;
                });
        });
        it("should start with proper values", function() {
           return instance.minWager()
                .then(_minWager => {
                    assert.equal(
                        _minWager.toString(10),
                        "" + MIN_WAGER,
                        "should have MIN_WAGER");

                    return instance.maxWager() 
                })
                .then(_maxWager => {
                    assert.equal(
                        _maxWager.toString(10),
                        "" + MAX_WAGER,
                        "should have MAX_WAGER");
                });
        });
    });

    describe("Make game hash.", function() {
        var instance;
        var gameHash;

        before("It should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new(MIN_WAGER, MAX_WAGER, { from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;
                });
        });

        it("It should fail if the game hash doesn't change", function() {
            return instance.makeGameHash(FIRST_SECRET, {from: player1, gas: MAX_GAS })
                .then(_gameHash  =>  {
                    gameHash = _gameHash;
                    
                    return instance.makeGameHash.call(SECOND_SECRET, {from: player2, gas: MAX_GAS })
                })
                .then(_check  =>  {
                    assert.notEqual(gameHash, _check, "Hash should change");
                });                    
        });
    });

    describe("Make move hash.", function() {
        var instance;
        var gameHash;
        var firstHash;

        before("It should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new(MIN_WAGER, MAX_WAGER, { from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;
                });
        });

        it("It should fail if the move hash changes", function() {
            return instance.makeMoveHash.call(FIRST_SECRET, ROCK_MOVE, { from: player1, gas: MAX_GAS })
                .then(_firstHash  =>  {
                    firstHash = _firstHash;
                    
                    return instance.makeMoveHash.call(FIRST_SECRET, ROCK_MOVE, { from: player1, gas: MAX_GAS })
                })
                .then(_check  =>  {
                    assert.equal(firstHash, _check, "Hash should be equal");
                });                    
        });

        it("It should fail if the move hash doesn't change", function() {
            return instance.makeMoveHash.call(FIRST_SECRET, ROCK_MOVE, { from: player1, gas: MAX_GAS })
                .then(_firstHash  =>  {
                    firstHash = _firstHash;
                    
                    return instance.makeMoveHash.call(FIRST_SECRET, PAPER_MOVE, { from: player1, gas: MAX_GAS })
                })
                .then(_check  =>  {
                    assert.notEqual(firstHash, _check, "Hash should change");

                    return instance.makeMoveHash.call(SECOND_SECRET, ROCK_MOVE, { from: player1, gas: MAX_GAS })
                })
                .then(_check  =>  {
                    assert.notEqual(firstHash, _check, "Hash should change");

                    return instance.makeMoveHash.call(FIRST_SECRET, ROCK_MOVE, { from: player2, gas: MAX_GAS })
                })
                .then(_check  =>  {
                    assert.notEqual(firstHash, _check, "Hash should change");
                });                    
        });
    });

    describe("First player plays.", function() {
        var instance;
        var gameHash;
        var firstHash = web3.sha3("firstHash"); // bogus hash

        before("It should deploy RockPaperScissor, get the instance and make a game hash", function() {
            return RockPaperScissor.new(MIN_WAGER, MAX_WAGER, {from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;

                    return instance.makeGameHash(firstHash, {from: player1, gas: MAX_GAS });
                })
                .then(_hash => {
                    gameHash = _hash;
                });
        });

        it("It should fail if the game hash is wrong", function() {
            return instance.play.call(0, firstHash, LONG_TIMEOUT, {from: player1, value: FIRST_WAGER, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move hash is wrong", function() {
            return instance.play.call(gameHash, 0, LONG_TIMEOUT, {from: player1, value: FIRST_WAGER, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the wager is too low", function() {
            return instance.play.call(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: TO_LOW_WAGER, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the wager is too high", function() {
            return instance.play.call(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: TO_HIGH_WAGER, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("Player 1 should start the game", function() {
            return instance.play(gameHash, firstHash, LONG_TIMEOUT, { from: player1, value: FIRST_WAGER, gas: MAX_GAS })
                .then(txObject => {
                    // console.log(txObject);
                    // var logs = JSON.stringify(txObject.logs, null, 2);
                    // console.log(logs);

                    assert.equal(txObject.logs.length, 1, "should have received 1 event");
                    assert.equal(txObject.logs[0].event, "LogGameStarted", "should be LogGameStarted event");
                    assert.equal(txObject.logs[0].args.player, player1, "sender should be the player1");
                    assert.equal(txObject.logs[0].args.gameHash, gameHash, "game hash is wrong");
                });
            });
    });

    describe("Second player plays.", function() {
        var instance;
        var gameHash;
        var firstHash = web3.sha3("firstHash"); // bogus hash
        var secondHash = web3.sha3("secondHash"); // bogus hash

        before("It should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new(MIN_WAGER, MAX_WAGER, {from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;
                });
        });

        var count = 0;
        beforeEach("Player 1 should start the game", function() {
            var gameSecret = web3.sha3("Game#" + (++count));
            return instance.makeGameHash(gameSecret, {from: player1, gas: MAX_GAS })
                .then(_hash => {
                        gameHash = _hash;

                        return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: FIRST_WAGER, gas: MAX_GAS })
                })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 1, "should have received 1 event");
                    assert.equal(txObject.logs[0].event, "LogGameStarted", "should be LogGameStarted event");
                });
        });


        it("It should fail if the game hash is wrong", function() {
            return instance.raise.call(0, secondHash, {from: player2, value: SECOND_WAGER, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move hash is wrong", function() {
            console.log("2 ");
            return instance.raise.call(gameHash, 0, {from: player2, value: SECOND_WAGER, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the wager is too low", function() {
            return instance.raise.call(gameHash, secondHash, {from: player2, value: TO_LOW_WAGER, gas: MAX_GAS })
                .then(() => {
                    throw "Expected wager " + TO_LOW_WAGER + " should have rejected";
                }) 
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the wager is too high", function() {
            return instance.raise.call(gameHash, secondHash, {from: player2, value: TO_HIGH_WAGER, gas: MAX_GAS })
                .then(() => {
                    throw "Expected wager " + TO_HIGH_WAGER + " should have rejected";
                }) 
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("Player 2 should play the game", function() {
            return instance.raise(gameHash, secondHash, {from: player2, value: SECOND_WAGER, gas: MAX_GAS })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 1, "should have received 1 event");
                    assert.equal(txObject.logs[0].event, "LogGameEnded", "should be LogGameEnded event");
                    assert.equal(txObject.logs[0].args.player, player2, "sender should be the player2");
                    assert.equal(txObject.logs[0].args.gameHash, gameHash, "game hash should be the same")
                });
        });
    });

    describe("Player 1 reveals its move.", function() {
        var instance;
        var gameHash;
        var firstHash;
        var secondHash = web3.sha3("secondHash"); // bogus hash
        var move       = ROCK_MOVE;

        before("It should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new(MIN_WAGER, MAX_WAGER, { from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;
                });
        });

        before("Player 1 & 2 should play the game", function() {
            return instance.makeGameHash(GAME_SECRET, {from: player1, gas: MAX_GAS })
                .then(_hash => {
                    gameHash = _hash;

                    return instance.makeMoveHash.call(FIRST_SECRET, move, {from: player1, gas: MAX_GAS })
                })
                .then(_firstHash => {
                    firstHash = _firstHash;
                    return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: FIRST_WAGER, gas: MAX_GAS })
                })
                .then(() => {
                    return instance.raise(gameHash, secondHash, {from: player2, value: SECOND_WAGER, gas: MAX_GAS })
                })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 1, "should have received 1 event");
                    assert.equal(txObject.logs[0].event, "LogGameEnded", "should be LogGameEnded event");
                    assert.equal(txObject.logs[0].args.player, player2, "sender should be the player2");
                    assert.equal(txObject.logs[0].args.gameHash, gameHash, "game hash should be the same")
                });
        });


        it("It should fail if the game hash is wrong", function() {
            return instance.reveal.call(0, FIRST_SECRET, move, { from: player1, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move hash is zero", function() {
            return instance.reveal.call(gameHash, 0, move, { from: player1, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move hash is not valid for move", function() {
            return instance.reveal.call(gameHash, UNKNOWN_SECRET, move, { from: player1, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move is NO_MOVE", function() {
            return instance.reveal.call(gameHash, FIRST_SECRET, NO_MOVE, { from: player1, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move is invalid", function() {
            return instance.reveal.call(gameHash, FIRST_SECRET, INVALID_MOVE, { from: player1, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the player didn't play", function() {
            return instance.reveal.call(gameHash, FIRST_SECRET, move, { from: owner, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("Player 1 should reveal its move", function() {
            return instance.reveal(gameHash, FIRST_SECRET, move, {from: player1, gas: MAX_GAS })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 0, "should have received 0 event");
                });
        });
    });

    describe("Player 2 reveals its move.", function() {
        var instance;
        var gameHash;
        var firstHash;
        var secondHash;
        var firstMove  = ROCK_MOVE;
        var secondMove = PAPER_MOVE;

        before("It should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new(MIN_WAGER, MAX_WAGER, {from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;
                });
        });

        before("Player 1 & 2 should play the game, player 1 reveals its move", function() {
            return instance.makeGameHash(GAME_SECRET, {from: player1, gas: MAX_GAS })
                .then(_hash => {
                    gameHash = _hash;

                    return instance.makeMoveHash.call(FIRST_SECRET, firstMove, {from: player1, gas: MAX_GAS })
                })
                .then(_firstHash => {
                    firstHash = _firstHash;

                    return instance.makeMoveHash.call(SECOND_SECRET, secondMove, {from: player2, gas: MAX_GAS })
                })
                .then(_secondHash => {
                    secondHash = _secondHash;

                    return instance.play(gameHash, firstHash, LONG_TIMEOUT, { from: player1, value: FIRST_WAGER, gas: MAX_GAS })
                })
                .then(() => {                
                    return instance.raise(gameHash, secondHash, {from: player2, value: SECOND_WAGER, gas: MAX_GAS })
                })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 1, "should have received 1 event");
                    assert.equal(txObject.logs[0].event, "LogGameEnded", "should be LogGameEnded event");
                    assert.equal(txObject.logs[0].args.player, player2, "sender should be the player2");
                    assert.equal(txObject.logs[0].args.gameHash, gameHash, "game hash should be the same");

                    return instance.reveal(gameHash, FIRST_SECRET, firstMove, {from: player1, gas: MAX_GAS })
                })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 0, "should have received 0 event");
                });
        });

        // it makes sense to redo all these tests?
        it("It should fail if the game hash is wrong", function() {
            return instance.reveal.call(0, SECOND_SECRET, secondMove, {from: player2, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move hash is zero", function() {
            return instance.reveal.call(gameHash, 0, secondMove, { from: player2, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move hash is not owned", function() {
            return instance.reveal.call(gameHash, UNKNOWN_SECRET, secondMove, { from: player2, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move is NO_MOVE", function() {
            return instance.reveal.call(gameHash, SECOND_SECRET, NO_MOVE, { from: player2, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move is invalid", function() {
            return instance.reveal.call(gameHash, SECOND_SECRET, INVALID_MOVE, { from: player2, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the player didn't play", function() {
            return instance.reveal.call(gameHash, SECOND_SECRET, secondMove, { from: owner, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("Player 2 should reveal its move", function() {
            return instance.reveal(gameHash, SECOND_SECRET, secondMove, {from: player2, gas: MAX_GAS })
                .then(txObject => {
                    // no event check here
                    assert.equal(txObject.logs.length, 1, "should have received 1 event");
                });
        });
    });

    describe("Player 1&2 play and reveal their move. ", function() {
        var instance;
        before("It should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new(MIN_WAGER, MAX_WAGER, {from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;
                });
        });

        var NAMES = ["None", "Player 1", "Player 2"];
        var MOVES = ["NONE", "ROCK", "PAPER", "SCISSORS"];
        var GAMES = [
            {
                moves: [1, 1], // R & R
                winner: -1,
                looser: -1,
                eventName: "LogNoWinner"
            },
            {
                moves: [1, 2], // R & P
                winner: 1,
                looser: 0,
                eventName: "LogWinnerIs"
            },
            {
                moves: [1, 3], // R & S
                winner: 0,
                looser: 1,
                eventName: "LogWinnerIs"
            },
            {
                moves: [2, 1], // P & R
                winner: 0,
                looser: 1,
                eventName: "LogWinnerIs"
            },
            {
                moves: [2, 2], // P & P
                winner: -1,
                looser: -1,
                eventName: "LogNoWinner"
            },
            {
                moves: [2, 3], // P & S
                winner: 1,
                looser: 0,
                eventName: "LogWinnerIs"
            },
            {
                moves: [3, 1], // S & R
                winner: 1,
                looser: 0,
                eventName: "LogWinnerIs"
            },
            {
                moves: [3, 2], // S & P
                winner: 0,
                looser: 1,
                eventName: "LogWinnerIs"
            },
            {
                moves: [3, 3], // S & S
                winner: -1,
                looser: -1,
                eventName: "LogNoWinner"
            }
        ];

        var count = 0;
        GAMES.forEach(function(game) {
            const firstMove  = game.moves[0];
            const secondMove = game.moves[1];
            const winner     = game.winner;
            const looser     = game.looser;
            const eventName  = game.eventName;

            var gameSecret = web3.sha3("Game#" + (++count));
            var gameHash;

            it(`Player 1 moves ${MOVES[firstMove]} and Player 2 moves ${MOVES[secondMove]} with winner: ${NAMES[winner+1]}`, function() {
                return instance.makeGameHash(gameSecret, {from: player1, gas: MAX_GAS })
                    .then(_hash => {
                        gameHash = _hash;

                        return instance.makeMoveHash.call(FIRST_SECRET, firstMove, {from: player1, gas: MAX_GAS })
                    })
                    .then(_firstHash => {
                        firstHash = _firstHash;

                        return instance.makeMoveHash.call(SECOND_SECRET, secondMove, {from: player2, gas: MAX_GAS })
                    })
                    .then(_secondHash => {
                        secondHash = _secondHash;

                        return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: FIRST_WAGER, gas: MAX_GAS })
                    })
                    .then(()=> {
                        return instance.raise(gameHash, secondHash, {from: player2, value: SECOND_WAGER, gas: MAX_GAS })
                    })
                    .then(txObject => {
                        return instance.reveal(gameHash, FIRST_SECRET, firstMove, {from: player1, gas: MAX_GAS })
                    })
                    .then(txObject => {
                        return instance.reveal(gameHash, SECOND_SECRET, secondMove, {from: player2, gas: MAX_GAS })
                    })
                    .then(txObject => {
                        assert.equal(txObject.logs.length, 1, "should have received 1 event");
                        assert.equal(txObject.logs[0].event, eventName, "should be " + eventName + " event");
                        if (winner == -1) {
                            assert.equal(txObject.logs[0].args.firstPlayer, player1, "player 1 invalid");
                            assert.equal(txObject.logs[0].args.secondPlayer, player2, "player 2 invalid");
                            assert.equal(txObject.logs[0].args.move, firstMove, "move invalid");
                        } else {
                            assert.equal(txObject.logs[0].args.winner, PLAYERS[winner], "winner invalid");
                            assert.equal(txObject.logs[0].args.winnerMove, game.moves[winner], "move invalid");
                            assert.equal(txObject.logs[0].args.looser, PLAYERS[looser], "player 2 invalid");
                            assert.equal(txObject.logs[0].args.looserMove, game.moves[looser], "move invalid");
                        }
                    });
            });
        });
    });
});
