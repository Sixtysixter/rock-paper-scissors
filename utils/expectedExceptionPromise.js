"use strict";

/**
 * @param {!Function.<!Promise>} action.
 * @param {!Number | !string | !BigNumber} gasToUse.
 * @returns {!Promise} which throws unless it hit a valid error.
 * 
 * usage examples: 
 * const expectedExceptionPromise = require("expected_exception_testRPC_and_geth.js");
 *
 * it("should not deploy my contract with value", function() {
 *
 *    return expectedExceptionPromise(function () {
 *            return MyContract.new(
 *               "param1",
 *                2,
 *                { from: accounts[0], value: 1, gas: 3000000 });
 *        }, 3000000);
 * });
 * 
 * or
 *
 * it("should not be possible to do something invalid", function () {
 *
 *    return MyContract.new({ from: accounts[0] })
 *       .then(function (newMyContract) {
 *          return extensions.expectedExceptionPromise(function () {
 *                    return newMyContract.myFunction("invalidParam1",
 *                       { from: accounts[0], gas: 3000000 });
 *               }, 3000000);
 *       })
 * });
 */
module.exports = function expectedExceptionPromise(action, gasToUse) {
    return new Promise(function (resolve, reject) {
            try {
                resolve(action());
            } catch(e) {
                reject(e);
            }
        })
        .then(function (txObj) {
            return typeof txObj === "string" 
                ? web3.eth.getTransactionReceiptMined(txObj) // regular tx hash
                : typeof txObj.receipt !== "undefined"
                    ? txObj.receipt // truffle-contract function call
                    : typeof txObj.transactionHash === "string"
                        ? web3.eth.getTransactionReceiptMined(txObj.transactionHash) // deployment
                        : txObj; // Unknown last case
        })
        .then(
            function (receipt) {
                // We are in Geth
                if (typeof receipt.status !== "undefined") {
                    // Byzantium
                    console.log("receipt.status " + receipt.status);
                    assert.strictEqual(parseInt(receipt.status), 0, "should have reverted");
                } else {
                    // Pre Byzantium
                    assert.equal(receipt.gasUsed, gasToUse, "should have used all the gas");
                }
            },
            function (e) {
                if ((e + "").indexOf("invalid JUMP") > -1 ||
                        (e + "").indexOf("out of gas") > -1 ||
                        (e + "").indexOf("invalid opcode") > -1 ||
                        (e + "").indexOf("revert") > -1) {
                    // We are in TestRPC
                } else if ((e + "").indexOf("please check your gas amount") > -1) {
                    // We are in Geth for a deployment
                } else {
                    throw e;
                }
            }
        );
};
