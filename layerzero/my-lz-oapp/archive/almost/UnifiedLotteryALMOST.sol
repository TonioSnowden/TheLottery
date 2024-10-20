// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OAppSender.sol";

contract UnifiedLottery is OApp {
    uint256 public ticketPrice;
    uint256 public lotteryDuration;
    uint256 public lotteryEndTime;
    address[] public participants;
    address public vrfHandler;
    address public winner;
    bool public lotteryEndingInitiated;
    bool public winnerSelected;
    uint256 public constant CREATOR_FEE = 10; // 10% fee for the creator

    uint256 public s_requestId;
    uint256 public lotteryId;
    uint256[] public ticketCounts;
    uint256 public totalTickets;

    mapping(address => uint256) public participantTicketCounts;
    mapping(address => uint32) public participantSourceChains;
    mapping(address => uint256) public pendingWithdrawals;

    // Message types
    uint8 private constant MSG_BUY_TICKETS = 1;
    uint8 private constant MSG_RECEIVE_PRIZE = 2;

    event TicketPurchased(address buyer, uint256 numberOfTickets);
    event LotteryEnded(address winner, uint256 prize, bool winnerPaid, bool ownerPaid);
    event LotteryEndRequested(uint256 requestId);
    event RandomWordsRequested(uint256 requestId);
    event LotteryEndingStep(string step);
    event NewLotteryStarted(uint256 lotteryId, uint256 ticketPrice, uint256 endTime);

    constructor(
        address _endpoint,
        address _delegate
    ) OApp(_endpoint, _delegate) Ownable(_delegate) {
    }

    function startNewLottery(uint256 _ticketPrice, uint256 _lotteryDuration) public onlyOwner {
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


    function buyTicketsCrossChain(uint32 _dstEid, uint256 numberOfTickets, bytes calldata options) external payable {
        require(!lotteryEndingInitiated, "Lottery ending initiated");
        require(numberOfTickets > 0, "Must purchase at least one ticket");
        uint256 totalCost = ticketPrice * numberOfTickets;
        require(msg.value >= totalCost, "Insufficient payment");

        bytes memory payload = abi.encodePacked(MSG_BUY_TICKETS, abi.encode(msg.sender, numberOfTickets));
        
        _lzSend(
            _dstEid,
            payload,
            _options, // Example options
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
        require(_payload.length > 0, "Empty payload");
        uint8 messageType = uint8(_payload[0]);
        bytes memory data = _payload[1:];

        if (messageType == MSG_BUY_TICKETS) {
            (address buyer, uint256 numberOfTickets) = abi.decode(data, (address, uint256));
            _addParticipant(buyer, numberOfTickets, _origin.srcEid);
        } else if (messageType == MSG_RECEIVE_PRIZE) {
            (address recipient, uint256 amount) = abi.decode(data, (address, uint256));
            pendingWithdrawals[recipient] += amount;
        } else {
            revert("Unknown message type");
        }
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
        require(block.timestamp >= lotteryDuration, "Lottery not yet ended");
        require(!lotteryEndingInitiated, "Lottery ending already initiated");
        require(participants.length > 0, "No participants in the lottery");
        
        lotteryEndingInitiated = true;
        s_requestId = IVRFHandler(vrfHandler).requestRandomWords();

        emit LotteryEndingStep("Lottery ending initiated");
        emit RandomWordsRequested(s_requestId);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) external {
        require(msg.sender == vrfHandler, "Only VRF handler can call this function");
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
        } else {
            // Winner is on another chain, send prize back via LayerZero
            bytes memory payload = abi.encodePacked(MSG_RECEIVE_PRIZE, abi.encode(winner, prize));
            _lzSend(
                winnerSourceChain,
                payload,
                bytes(""),  // This is the _options parameter
                MessagingFee(prize, 0),  // Combine prize into MessagingFee struct
                payable(address(this))  // This is the _refundAddress
            );       
            winnerPaid = true; // Assuming LayerZero transfer is successful
        }
        ownerPaid = _safeTransfer(payable(owner()), creatorFee);
        
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

    function setLotteryParameters(uint256 _ticketPrice, uint256 _lotteryDuration) external onlyOwner {
        ticketPrice = _ticketPrice;
        lotteryDuration = _lotteryDuration;
        lotteryId++;
        lotteryEndingInitiated = false;
        winnerSelected = false;
        delete participants;
        winner = address(0);
        delete ticketCounts;
        totalTickets = 0;

        emit NewLotteryStarted(lotteryId, ticketPrice, block.timestamp + lotteryDuration);
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

    function withdraw(address payable recipient) public {
        require(owner() == _msgSender() || _msgSender() == recipient, "Not authorized");
        uint256 amount = pendingWithdrawals[recipient];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[recipient] = 0;
        
        (bool success,) = recipient.call{value: amount}("");
        require(success, "Withdrawal failed");
    }

    function getPendingWithdrawal(address addr) public view returns (uint256) {
        return pendingWithdrawals[addr];
    }

    /**
     * @notice Quotes the gas needed to pay for the full omnichain transaction in native gas or ZRO token.
     * @param _dstEid Destination chain's endpoint ID.
     * @param _message The message.
     * @param _options Message execution options (e.g., for sending gas to destination).
     * @param _payInLzToken Whether to return fee in ZRO token.
     * @return fee A `MessagingFee` struct containing the calculated gas fee in either the native token or ZRO token.
     */
    function quote(
        uint32 _dstEid,
        string memory _message,
        bytes memory _options,
        bool _payInLzToken
    ) public view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(_message);
        fee = _quote(_dstEid, payload, _options, _payInLzToken);
    }

    receive() external payable {}

    // Add this function to set the VRF handler address
    function setVRFHandler(address _vrfHandler) external onlyOwner {
        require(_vrfHandler != address(0), "Invalid VRF handler address");
        vrfHandler = _vrfHandler;
    }
}

interface IVRFHandler {
    function requestRandomWords() external returns (uint256);
}
