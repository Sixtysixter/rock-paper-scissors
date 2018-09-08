const RPS = artifacts.require("./RockPaperScissor.sol");

module.exports = function(deployer, network, accounts) {
    const OWNER     = accounts[0];
    const GAS_LIMIT = 4500000;
  	deployer.deploy(RPS, { from: OWNER, gas: GAS_LIMIT });
};
