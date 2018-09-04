const RPS = artifacts.require("./RockPaperScissor.sol");

module.exports = function(deployer, network, accounts) {
    const OWNER     = accounts[0];
    const GAS_LIMIT = 4500000;
    const MIN_WAGER = 100;
    const MAX_WAGER = 400000;
  	deployer.deploy(RPS, MIN_WAGER, MAX_WAGER, { from: OWNER, gas: GAS_LIMIT });
};
