const Promise = require("bluebird");

Promise.promisifyAll(web3.eth, { suffix: "Promise" });

web3.eth.expectedExceptionPromise = require("../utils/expectedExceptionPromise.js");
web3.eth.expectedOkPromise = require("../utils/expectedOkPromise.js");

// Import the smart contracts
const RockPaperScissor = artifacts.require("./RockPaperScissor.sol");

contract('RockPaperScissor', function(accounts) {
    const MAX_GAS          = 3000000;

    const WAGER            = web3.toWei(40, 'wei'); 
    const INVALID_WAGER    = web3.toWei(70, 'wei'); 

    const GAME_HASH        = web3.sha3("Let's play!!");

    const FIRST_SECRET     = web3.sha3("firstPlayer");
    const INVALID_SECRET   = web3.sha3("unknownPlayer");

    const LONG_TIMEOUT     = 100;
    const SHORT_TIMEOUT    = 1;

    const NO_MOVE          = 0;
    const ROCK_MOVE        = 1;
    const PAPER_MOVE       = 2;
    const SCISSORS_MOVE    = 3;
    const INVALID_MOVE     = 4;

    let owner;
    let player1;
    let player2;
    let PLAYERS = [];
    before("check accounts number", function() {
        assert.isAtLeast(accounts.length, 3, "not enough accounts");
        [owner, player1, player2] = accounts;
        PLAYERS = [player1, player2];

        console.log("Player 1: " + player1);
        console.log("Player 2: " + player2);
    });

    describe("Try deployment", function() {
        let instance;
        before("should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new({from: owner, gas: MAX_GAS})
                .then(function(_instance) {
                    instance = _instance;
                });
        });
    });

    describe("Make move hash.", function() {
        let instance;
        let gameHash;
        let firstHash;

        before("It should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new({from: owner, gas: MAX_GAS})
                .then(function(_instance) {
                    instance = _instance;
                });
        });

        it("It should fail if the move hash changes", function() {
            return instance.makeMoveHash.call(FIRST_SECRET, ROCK_MOVE, {from: player1, gas: MAX_GAS})
                .then(_firstHash  =>  {
                    firstHash = _firstHash;
                    
                    return instance.makeMoveHash.call(FIRST_SECRET, ROCK_MOVE, {from: player1, gas: MAX_GAS})
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

                    return instance.makeMoveHash.call(FIRST_SECRET, ROCK_MOVE, { from: player2, gas: MAX_GAS })
                })
                .then(_check  =>  {
                    assert.notEqual(firstHash, _check, "Hash should change");
                });                    
        });
    });

    describe("Should check play parameters.", function() {
        let instance;
        const gameHash = GAME_HASH;
        const firstHash = web3.sha3("firstHash"); // bogus hash

        before("It should deploy RockPaperScissor, get the instance and make a game hash", function() {
            return RockPaperScissor.new({from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;
                });
        });

        it("It should fail if the game hash is wrong", function() {
            return instance.play.call(0, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move hash is wrong", function() {
            return instance.play.call(gameHash, 0, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the timeout is too low", function() {
            return instance.play.call(gameHash, firstHash, SHORT_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });
    });

    describe("First player plays.", function() {
        let instance;
        const gameHash  = GAME_HASH;
        const firstHash = web3.sha3("firstHash"); // bogus hash

        beforeEach("It should deploy RockPaperScissor, get the instance", function() {
            return RockPaperScissor.new({from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;
                });
        });

        it("Play should emit just 1 event", function() {
            return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS})
                .then(txObject => {
                    assert.equal(txObject.logs.length, 1, "should have received 1 event");
                    assert.equal(txObject.logs[0].event, "LogGameStarted", "should be LogGameStarted event");
                    assert.equal(txObject.logs[0].args.player, player1, "sender should be the player1");
                    assert.equal(txObject.logs[0].args.gameHash, gameHash, "game hash is wrong");
                });
            });

        it("Play should set game ", function() {
            return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS})
                .then(() => {
                    return instance.games(gameHash);
                })
                .then(_game => {
                    assert.equal(_game[0], firstHash, "should have the move hash set");
                    assert.equal(_game[1], player1, "should have the player 1 set");
                    assert.equal(_game[3], 0, "should have the player 2 not set");
                    assert.equal(_game[4], WAGER, "should have the wager set");
                    assert.notEqual(_game[5], 0, "should have the timeout not zeros");
                });
            });

        it("Play should fails if player 1 plays twice", function() {
            return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS})
                .then(() => {
                    return web3.eth.expectedExceptionPromise(function() {
                        return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS})
                    }, MAX_GAS)
                });
            });
    });

    describe("Should check raise parameters.", function() {
        let instance;
        const gameHash   = GAME_HASH;
        const firstHash  = web3.sha3("firstHash"); // bogus hash

        before("It should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new({from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;

                    return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                });
        });

        it("It should fail if the game hash is wrong", function() {
            return instance.raise.call(0, ROCK_MOVE, {from: player2, value: WAGER, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move is wrong", function() {
            console.log("2 ");
            return instance.raise.call(gameHash, NO_MOVE, {from: player2, value: WAGER, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the wager is wrong", function() {
            return instance.raise.call(gameHash, ROCK_MOVE, {from: player2, value: INVALID_WAGER, gas: MAX_GAS})
                .catch(error  =>  {
                    console.log("Exception raised: " + error);
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });
    });

    describe("Second player plays.", function() {
        let instance;
        const gameHash   = GAME_HASH;
        const firstHash  = web3.sha3("firstHash"); // bogus hash

        beforeEach("It should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new({from: owner, gas: MAX_GAS })
                .then(_instance => {
                    instance = _instance;

                    return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                });
        });

        it("Raise should emit just 1 event", function() {
            return instance.raise(gameHash, ROCK_MOVE, {from: player2, value: WAGER, gas: MAX_GAS })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 1, "should have received 1 event");
                    assert.equal(txObject.logs[0].event, "LogGameEnded", "should be LogGameEnded event");
                    assert.equal(txObject.logs[0].args.player, player2, "sender should be the player2");
                    assert.equal(txObject.logs[0].args.gameHash, gameHash, "game hash should be the same");
                    assert.equal(txObject.logs[0].args.move, ROCK_MOVE, "move  should be the same");
                    // and the block timeout???
                });
        });

        it("Raise should set the game for player 2", function() {
            return instance.raise(gameHash, ROCK_MOVE, {from: player2, value: WAGER, gas: MAX_GAS })
                .then(() => {
                    return instance.games(gameHash);
                })
                .then(_game => {
                    assert.equal(_game[3], player2, "should be the player 2");                    
                    assert.equal(_game[4], WAGER * 2, "should be the right wager");
                });
            });

        it("Raise should fails if player 2 plays twice", function() {
            return instance.raise(gameHash, ROCK_MOVE, {from: player2, value: WAGER, gas: MAX_GAS })
                .then(() => {
                    return web3.eth.expectedExceptionPromise(function() {
                        return instance.raise(gameHash, ROCK_MOVE, {from: player2, value: WAGER, gas: MAX_GAS })
                    }, MAX_GAS)
                });
            });
    });

    describe("First player claims the game", function() {
        let instance;
        const gameHash    = GAME_HASH;
        const firstHash   = web3.sha3("firstHash"); // bogus hash
        const anotherHash = web3.sha3("anotherHash"); // bogus hash

        beforeEach("It should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new({from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;
                });
        });

        it("It should fail if the game is running", function() {
            return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                .then(() => {
                    return web3.eth.expectedExceptionPromise(function() {
                        return instance.claim(gameHash, {from: player1, gas: MAX_GAS })
                    }, MAX_GAS)
                });
        });

        it("It should fail if the sender is wrong", function() {
            return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                .then(() => {
                    return web3.eth.expectedExceptionPromise(function() {
                        return instance.claim(gameHash, {from: player2, gas: MAX_GAS })
                    }, MAX_GAS)
                });
        });

        it("It should fail if the game hash is zero", function() {
            return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                .then(() => {
                    return web3.eth.expectedExceptionPromise(function() {
                        return instance.claim(0, {from: player1, gas: MAX_GAS })
                    }, MAX_GAS)
                });
        });

        it("It should fail if the game hash is wrong", function() {
            return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                .then(() => {
                    return web3.eth.expectedExceptionPromise(function() {
                        return instance.claim(anotherHash, {from: player1, gas: MAX_GAS })
                    }, MAX_GAS)
                });
        });

        it("It should claims the game", function() {
            return instance.play(gameHash, firstHash, SHORT_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                .then(() => {
                    return instance.play(anotherHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                })
                .then(() => {
                    return instance.claim(gameHash, {from: player1, gas: MAX_GAS })
                })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 1, "should have received 1 event");
                    assert.equal(txObject.logs[0].event, "LogClaim", "should be LogClaim event");
                    assert.equal(txObject.logs[0].args.player, player1, "sender should be the player2");
                    assert.equal(txObject.logs[0].args.gameHash, gameHash, "game hash should be the same")
                });
        });

        it("It should nullify the game", function() {
            return instance.play(gameHash, firstHash, SHORT_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                .then(() => {
                    return instance.play(anotherHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                })
                .then(() => {
                    return instance.claim(gameHash, {from: player1, gas: MAX_GAS })
                })
                .then(() => {
                    return instance.games(gameHash);
                })
                .then(_game => {
                    assert.equal(_game[0], 0, "the moveHash 2 should be 0");                    
                    assert.equal(_game[1], 0, "the player 1 should be 0");                    
                    assert.equal(_game[3], 0, "the player 2 should be 0");                    
                });
        });

        it("It should fails if claims the game twice", function() {
            return instance.play(gameHash, firstHash, SHORT_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                .then(() => {
                    return instance.play(anotherHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                })
                .then(() => {
                    return instance.claim(gameHash, {from: player1, gas: MAX_GAS })
                })
                .then(() => {
                    return web3.eth.expectedExceptionPromise(function() {
                        return instance.claim(gameHash, {from: player1, gas: MAX_GAS })
                    }, MAX_GAS)
                });
        });

        it("It should fails if player 2 already played", function() {
            return instance.play(gameHash, firstHash, SHORT_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                .then(() => {
                    return instance.raise(gameHash, ROCK_MOVE, {from: player2, value: WAGER, gas: MAX_GAS })
                })
                .then(() => {
                    return web3.eth.expectedExceptionPromise(function() {
                        return instance.claim(gameHash, {from: player1, gas: MAX_GAS })
                    }, MAX_GAS)
                });
        });
    });

    describe("Should check reveals parameters", function() {
        let instance;
        const gameHash   = GAME_HASH;
        let firstHash;
        const secondHash = web3.sha3("secondHash"); // bogus hash
        const move       = ROCK_MOVE;

        before("It should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new({from: owner, gas: MAX_GAS})
                .then(function(_instance) {
                    instance = _instance;
                });
        });

        before("Player 1 & 2 should play the game", function() {
            return instance.makeMoveHash.call(FIRST_SECRET, move, {from: player1, gas: MAX_GAS})
                .then(_firstHash => {
                    firstHash = _firstHash;
                    return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                })
                .then(() => {
                    return instance.raise(gameHash, ROCK_MOVE, {from: player2, value: WAGER, gas: MAX_GAS })
                });
        });


        it("It should fail if the game hash is wrong", function() {
            return instance.reveal.call(0, FIRST_SECRET, move, {from: player1, gas: MAX_GAS})
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move hash is zero", function() {
            return instance.reveal.call(gameHash, 0, move, {from: player1, gas: MAX_GAS})
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move hash is not valid for move", function() {
            return instance.reveal.call(gameHash, INVALID_SECRET, move, {from: player1, gas: MAX_GAS})
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move is NO_MOVE", function() {
            return instance.reveal.call(gameHash, FIRST_SECRET, NO_MOVE, {from: player1, gas: MAX_GAS})
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });

        it("It should fail if the move is invalid", function() {
            return instance.reveal.call(gameHash, FIRST_SECRET, INVALID_MOVE, {from: player1, gas: MAX_GAS})
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: invalid opcode");
                });
        });

        it("It should fail if the player 2 didn't play", function() {
            return instance.reveal.call(gameHash, FIRST_SECRET, move, { from: owner, gas: MAX_GAS })
                .catch(error  =>  {
                    assert.include(error.message, "VM Exception while processing transaction: revert");
                });
        });
    });

    describe("Player 1 should reveal its move.", function() {
        let   instance;
        let   firstHash;
        const gameHash   = GAME_HASH;
        const move       = ROCK_MOVE;
        const fakeMove   = PAPER_MOVE;

        beforeEach("It should deploy RockPaperScissor and Player 1 & 2 should play the game", function() {
            return RockPaperScissor.new({from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;
                })
                .then(() => {
                    return instance.makeMoveHash.call(FIRST_SECRET, move, {from: player1, gas: MAX_GAS})
                })
                .then(_firstHash => {
                    firstHash = _firstHash;
                    return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                })
                .then(() => {
                    return instance.raise(gameHash, ROCK_MOVE, {from: player2, value: WAGER, gas: MAX_GAS })
                });
        });

        it("Player 1 should reveal its move", function() {
            return instance.reveal(gameHash, FIRST_SECRET, move, {from: player1, gas: MAX_GAS })
                .then(txObject => {
                    assert.equal(txObject.logs.length, 1, "should have received 1 event");

                    return instance.games(gameHash);
                })
                .then(_game => {
                    assert.equal(_game[0], 0, "the moveHash 2 should be 0");                    
                    assert.equal(_game[1], 0, "the player 1 should be 0");                    
                    assert.equal(_game[3], 0, "the player 2 should be 0");                    
                });
        });

        it("should fail if the move is wrong", function() {
            return web3.eth.expectedExceptionPromise(function() {
                return instance.reveal(gameHash, FIRST_SECRET, fakeMove, {from: player1, gas: MAX_GAS })
            }, MAX_GAS);
        });


        it("Should fail if Player 1 reveals its move twice", function() {
            return instance.reveal(gameHash, FIRST_SECRET, move, {from: player1, gas: MAX_GAS })
                .then(() => {
                    return web3.eth.expectedExceptionPromise(function() {
                        return instance.reveal(gameHash, FIRST_SECRET, fakeMove, {from: player1, gas: MAX_GAS })
                    }, MAX_GAS)
                });
        });
    });

    describe("Player 1&2 play and then player 1 reveal its move. ", function() {
        let instance;
        before("It should deploy RockPaperScissor and get the instance", function() {
            return RockPaperScissor.new({from: owner, gas: MAX_GAS })
                .then(function(_instance) {
                    instance = _instance;
                });
        });

        const NAMES = ["None", "Player 1", "Player 2"];
        const MOVES = ["NONE", "ROCK", "PAPER", "SCISSORS"];
        const GAMES = [
            {
                moves: [1, 1], // R & R
                winner: -1,
                looser: -1,
                eventName: "LogNoWinner"
            }
            ,{
                moves: [1, 2], // R & P
                winner: 1,
                looser: 0,
                eventName: "LogWinnerIs"
            }
            ,{
                moves: [1, 3], // R & S
                winner: 0,
                looser: 1,
                eventName: "LogWinnerIs"
            }
            ,{
                moves: [2, 1], // P & R
                winner: 0,
                looser: 1,
                eventName: "LogWinnerIs"
            }
            ,{
                moves: [2, 2], // P & P
                winner: -1,
                looser: -1,
                eventName: "LogNoWinner"
            }
            ,{
                moves: [2, 3], // P & S
                winner: 1,
                looser: 0,
                eventName: "LogWinnerIs"
            }
            ,{
                moves: [3, 1], // S & R
                winner: 1,
                looser: 0,
                eventName: "LogWinnerIs"
            }
            ,{
                moves: [3, 2], // S & P
                winner: 0,
                looser: 1,
                eventName: "LogWinnerIs"
            }
            ,{
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
            const gameHash   = GAME_HASH;

            it(`Player 1 moves ${MOVES[firstMove]} and Player 2 moves ${MOVES[secondMove]} with winner: ${NAMES[winner+1]}`, function() {
                return instance.makeMoveHash.call(FIRST_SECRET, firstMove, {from: player1, gas: MAX_GAS })
                    .then(_firstHash => {
                        firstHash = _firstHash;

                        return instance.play(gameHash, firstHash, LONG_TIMEOUT, {from: player1, value: WAGER, gas: MAX_GAS })
                    })
                    .then(()=> {
                        return instance.raise(gameHash, secondMove, {from: player2, value: WAGER, gas: MAX_GAS })
                    })
                    .then(() => {
                        return instance.reveal(gameHash, FIRST_SECRET, firstMove, {from: player1, gas: MAX_GAS })
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
