var RPS       = artifacts.require("./RockPaperScissor.sol");

module.exports = function(deployer, network, accounts) {
    let owner = accounts[0];

    const GAS_LIMIT        = 4500000;
    const MIN_WAGER        = 100;
    const MAX_WAGER        = 400000;
  	deployer.deploy(RPS, MIN_WAGER, MAX_WAGER, { from: owner, gas: GAS_LIMIT });
};
