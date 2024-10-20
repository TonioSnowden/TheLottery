// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

contract UserLottery is OApp {
    uint256 public ticketPrice;
    uint32 public lotteryChainEid;

    constructor(address _endpoint, address _owner, uint256 _ticketPrice, uint32 _lotteryChainEid) OApp(_endpoint, _owner) Ownable(_owner) {
        ticketPrice = _ticketPrice;
        lotteryChainEid = _lotteryChainEid;
    }

    function buyTickets(uint256 numberOfTickets) external payable {
        require(numberOfTickets > 0, "Must purchase at least one ticket");
        uint256 totalCost = ticketPrice * numberOfTickets;
        require(msg.value >= totalCost, "Insufficient payment");

        bytes memory payload = abi.encode(msg.sender, numberOfTickets);
        
        _lzSend(
            lotteryChainEid,
            payload,
            abi.encodePacked(uint16(1), uint256(300000)), // Example options
            MessagingFee(totalCost, 0),
            payable(msg.sender)
        );
    }

    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _payload,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        // Handle incoming messages from the Lottery contract (e.g., lottery results)
    }

    function setTicketPrice(uint256 _newPrice) external onlyOwner {
        ticketPrice = _newPrice;
    }

    function setLotteryChainEid(uint32 _newEid) external onlyOwner {
        lotteryChainEid = _newEid;
    }

    // Function to withdraw any excess ETH
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
