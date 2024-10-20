// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

// import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/vrf/interfaces/VRFCoordinatorV2Interface.sol";

contract Lottery is OApp, VRFConsumerBaseV2 {
    uint256 public ticketPrice;
    uint256 public lotteryDuration;
    address[] public participants;
    address public winner;
    uint256 public lotteryEndTime;
    bool public lotteryEndingInitiated;
    bool public winnerSelected;
    uint256 public constant CREATOR_FEE = 10; // 10% fee for the creator

    VRFCoordinatorV2Interface public vrfCoordinator;
    bytes32 public keyHash;
    uint64 public subscriptionId;
    uint32 public callbackGasLimit;
    uint16 public requestConfirmations;
    uint32 public numWords;

    uint256 public s_requestId;
    address s_owner;
    uint256 public lotteryId;
    uint256[] public ticketCounts;
    uint256 public totalTickets;

    mapping(address => uint256) public participantTicketCounts;
    mapping(address => uint32) public participantSourceChains;

    event TicketPurchased(address buyer, uint256 numberOfTickets);
    event LotteryEnded(address winner, uint256 prize, bool winnerPaid, bool ownerPaid);
    event LotteryEndRequested(uint256 requestId);
    event RandomWordsRequested(uint256 requestId);
    event LotteryEndingStep(string step);
    event NewLotteryStarted(uint256 lotteryId, uint256 ticketPrice, uint256 endTime);

    constructor(
        address _endpoint,
        address _owner,
        uint256 _ticketPrice,
        uint256 _lotteryDuration,
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId,
        uint32 _callbackGasLimit,
        uint16 _requestConfirmations,
        uint32 _numWords
    ) OApp(_endpoint, _owner) VRFConsumerBaseV2(_vrfCoordinator) {
        ticketPrice = _ticketPrice;
        lotteryDuration = _lotteryDuration;
        lotteryEndTime = block.timestamp + _lotteryDuration;
        vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
        callbackGasLimit = _callbackGasLimit;
        requestConfirmations = _requestConfirmations;
        numWords = _numWords;
        s_owner = _owner;
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
        require(numberOfTickets > 0, "Must purchase at least one ticket");
        require(msg.value == ticketPrice * numberOfTickets, "Incorrect payment amount");
        _addParticipant(msg.sender, numberOfTickets, 0); // 0 indicates native chain
    }

    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _payload,
        address _executor,
        bytes calldata _extraData
    ) internal override {
        require(!lotteryEndingInitiated, "Lottery ending initiated");
        (address buyer, uint256 numberOfTickets) = abi.decode(_payload, (address, uint256));
        _addParticipant(buyer, numberOfTickets, _origin.srcEid);
    }

    function _addParticipant(address buyer, uint256 numberOfTickets, uint32 sourceChain) internal {
        if (participantTicketCounts[buyer] == 0) {
            participants.push(buyer);
        }
        participantTicketCounts[buyer] += numberOfTickets;
        participantSourceChains[buyer] = sourceChain;
        ticketCounts.push(numberOfTickets);
        totalTickets += numberOfTickets;
        
        emit TicketPurchased(buyer, numberOfTickets);
    }

    function endLottery() public {
        require(block.timestamp >= lotteryEndTime, "Lottery not yet ended");
        require(!lotteryEndingInitiated, "Lottery ending already initiated");
        require(participants.length > 0, "No participants in the lottery");
        
        lotteryEndingInitiated = true;
        s_requestId = vrfCoordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        emit LotteryEndingStep("Lottery ending initiated");
        emit RandomWordsRequested(s_requestId);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
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
        
        uint32 winnerSourceChain = participantSourceChains[winner];
        bool winnerPaid;
        bool ownerPaid;

        if (winnerSourceChain == 0) {
            // Winner is on the native chain, transfer directly
            winnerPaid = _safeTransfer(payable(winner), prize);
            ownerPaid = _safeTransfer(payable(s_owner), creatorFee);
        } else {
            // Winner is on another chain, send prize back via LayerZero
            bytes memory payload = abi.encode(winner, prize);
            _lzSend(winnerSourceChain, payload, payable(address(this)), address(0), bytes(""), prize);
            winnerPaid = true; // Assuming LayerZero transfer is successful
            ownerPaid = _safeTransfer(payable(s_owner), creatorFee);
        }
        
        // If automatic payout fails, store for manual withdrawal
        if (!winnerPaid) {
            pendingWithdrawals[winner] = prize;
        }
        if (!ownerPaid) {
            pendingWithdrawals[s_owner] = creatorFee;
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

    receive() external payable {}

    function _lzSend(
        uint32 _dstEid,
        bytes memory _payload,
        bytes memory _options,
        MessagingFee memory _fee,
        address payable _refundAddress
    ) internal virtual override {
        super._lzSend(_dstEid, _payload, _options, _fee, _refundAddress);
    }
}
