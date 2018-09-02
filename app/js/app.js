require("file-loader?name=../index.html!../index.html");

const Web3 = require("web3");
const Promise = require("bluebird");
const truffleContract = require("truffle-contract");
const $ = require("jquery");
// Not to forget our built contract
const rpsJson = require("../../build/contracts/RockPaperScissor.json");

// Supports Mist, and other wallets that provide 'web3'.
// if (typeof web3 !== 'undefined') {
//     // Use the Mist/wallet/Metamask provider.
//     var provider = web3.currentProvider;
//     console.log("Provider " + web3.currentProvider);
//     window.web3 = new Web3(web3.currentProvider);
// } else {
//     // Your preferred fallback.
//     window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545')); 
// }

window.web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545')); 

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(web3.version, { suffix: "Promise" });

const RPS = truffleContract(rpsJson);
RPS.setProvider(web3.currentProvider);

window.addEventListener('load', function() {
    return web3.eth.getAccountsPromise()
        .then(accounts => {
            if (accounts.length < 3) {
                $("#balance").html("N/A");
                throw new Error("No account with which to transact");
            }
            window.player1 = accounts[1];
            window.player2 = accounts[2];
            // console.log("Account:", window.account);
            return web3.version.getNetworkPromise();
        })
        .then(network => {
            console.log("Network:", network.toString(10));
            return RPS.deployed();
        })
        .then(deployed => {
            window.RPS = deployed;
            return web3.eth.getBalance(window.player1);
        })
        // Notice how the conversion to a string is done at the very last moment.
        .then(balance => {
            $("#balance1").html(balance.toString(10));
            return web3.eth.getBalance(window.player2)
       })
        .then(balance => {
            $("#balance2").html(balance.toString(10));
       })
        // We wire it when the system looks in order.
        // .then(() => $("#send").click(sendCoin))
        // Never let an error go unlogged.
        .catch(console.error);
});


