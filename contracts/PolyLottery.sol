// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract PolyLottery is VRFConsumerBaseV2Plus {
    uint256 public ticketPrice;
    uint256 public lotteryDuration;
    address[] public participants;
    address public winner;
    uint256 public lotteryEndTime;
    bool public lotteryEndingInitiated;
    bool public winnerSelected;
    uint256 public constant CREATOR_FEE = 10; // 10% fee for the creator

    uint256 s_subscriptionId;
    bytes32 keyHash;
    uint32 constant callbackGasLimit = 100000;
    uint16 constant requestConfirmations = 3;
    uint32 constant numWords = 1;

    uint256 public s_requestId;
    address s_owner;
    uint256 public lotteryId;
    uint256[] public ticketCounts;
    uint256 public totalTickets;

    event TicketPurchased(address buyer);
    event LotteryEnded(address winner, uint256 prize, bool winnerPaid, bool ownerPaid);
    event LotteryEndRequested(uint256 requestId);
    event RandomWordsRequested(uint256 requestId);
    event LotteryEndingStep(string step);
    event NewLotteryStarted(uint256 lotteryId, uint256 ticketPrice, uint256 endTime);
    event TicketsPurchased(address buyer, uint256 numberOfTickets);

    constructor(
        uint256 _ticketPrice,
        uint256 _lotteryDuration,
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        ticketPrice = _ticketPrice;
        lotteryDuration = _lotteryDuration;
        lotteryEndTime = block.timestamp + _lotteryDuration;
        s_subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        s_owner = msg.sender;
        startNewLottery(_ticketPrice, _lotteryDuration);
    }

    function startNewLottery(uint256 _ticketPrice, uint256 _lotteryDuration) public {
        require(msg.sender == s_owner, "Not owner");
        require(winnerSelected || participants.length == 0, "Current lottery not ended");

        lotteryId++;
        ticketPrice = _ticketPrice;
        lotteryEndTime = block.timestamp + _lotteryDuration;
        lotteryEndingInitiated = false;
        winnerSelected = false;
        delete participants;
        winner = address(0);
        delete ticketCounts;
        totalTickets = 0;

        emit NewLotteryStarted(lotteryId, ticketPrice, lotteryEndTime);
    }

    function buyTickets(uint256 numberOfTickets) external payable {
        require(!lotteryEndingInitiated, "Lottery ending initiated");
        require(msg.value == ticketPrice * numberOfTickets, "Incorrect payment amount");
        participants.push(msg.sender);
        ticketCounts.push(numberOfTickets);
        totalTickets += numberOfTickets;
        emit TicketsPurchased(msg.sender, numberOfTickets);
    }

    function requestRandomWords() internal returns (uint256 requestId){
        requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: s_subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
        // s_requestId = requestId;
        return requestId;
    }

    function endLottery() public {
        require(block.timestamp >= lotteryEndTime, "Lottery not yet ended");
        require(!lotteryEndingInitiated, "Lottery ending already initiated");
        require(participants.length > 0, "No participants in the lottery");
        
        lotteryEndingInitiated = true;
        s_requestId = requestRandomWords();

        emit LotteryEndingStep("Lottery ending initiated");
        emit RandomWordsRequested(s_requestId);
    }

    

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        require(s_requestId == requestId, "Wrong requestId");
        require(lotteryEndingInitiated, "Lottery ending not initiated");
        require(participants.length > 0, "No participants");
        require(!winnerSelected, "Winner already selected");
        
        uint256 randomNumber = randomWords[0] % totalTickets;
        uint256 sum = 0;
        for (uint256 i = 0; i < ticketCounts.length; i++) {
            sum += ticketCounts[i];
            if (randomNumber < sum) {
                winner = participants[i];
                break;
            }
        }
        
        uint256 totalBalance = address(this).balance;
        uint256 prize = totalBalance * (100 - CREATOR_FEE) / 100;
        uint256 creatorFee = totalBalance - prize;
        
        winnerSelected = true;
        
        // Attempt automatic payout
        bool winnerPaid = _safeTransfer(payable(winner), prize);
        bool ownerPaid = _safeTransfer(payable(s_owner), creatorFee);
        
        // If automatic payout fails, store for manual withdrawal
        if (!winnerPaid) {
            pendingWithdrawals[winner] = prize;
        }
        if (!ownerPaid) {
            pendingWithdrawals[owner()] = creatorFee;
        }
        
        emit LotteryEnded(winner, prize, winnerPaid, ownerPaid);
    }

    function _safeTransfer(address payable recipient, uint256 amount) private returns (bool) {
        (bool success, ) = recipient.call{value: amount, gas: 100000}("");
        return success;
    }

    function setLotteryParameters(uint256 _ticketPrice, uint256 _lotteryDuration) external {
        require(msg.sender == s_owner, "Not owner");
        ticketPrice = _ticketPrice;
        lotteryDuration = _lotteryDuration;
    }

    function getParticipants() external view returns (address[] memory) {
        return participants;
    }

    function getLotteryBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getWinner() public view returns (address) {
        require(winnerSelected, "Lottery has not ended yet");
        return winner;
    }

    function getTotalTickets() external view returns (uint256) {
        return totalTickets;
    }

    function getTicketCounts() external view returns (uint256[] memory) {
        return ticketCounts;
    }

    mapping(address => uint256) public pendingWithdrawals;

    function withdraw(address payable recipient) public {
        require(msg.sender == s_owner || msg.sender == recipient, "Not authorized");
        uint256 amount = pendingWithdrawals[recipient];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[recipient] = 0;
        
        (bool success,) = recipient.call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    function getPendingWithdrawal(address addr) public view returns (uint256) {
        return pendingWithdrawals[addr];
    }

}
