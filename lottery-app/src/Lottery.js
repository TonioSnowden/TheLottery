import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import PolyLotteryABI from './PolyLotteryABI.json';
import lastWinnerData from './lastWinner.json';
import lotteryInfoData from './lotteryInfo.json';

const CONTRACT_ADDRESS = '0xf4e53F35b1e8665928518D1511BB1Ff3Fa30B791';

function Lottery() {
  const [totalPrize, setTotalPrize] = useState(lotteryInfoData.currentJackpot);
  const [ticketPrice, setTicketPrice] = useState(lotteryInfoData.ticketPrice);
  const [numTickets, setNumTickets] = useState(1);
  const [contract, setContract] = useState(null);
  const [lastWinner, setLastWinner] = useState(lastWinnerData);
  const [isConnected, setIsConnected] = useState(false);
  const [maticUsdRate, setMaticUsdRate] = useState(null);

  useEffect(() => {
    const init = async () => {
      const provider = await detectEthereumProvider();
      if (provider) {
        const ethersProvider = new ethers.providers.Web3Provider(provider);
        // Check if already connected
        const accounts = await ethersProvider.listAccounts();
        if (accounts.length > 0) {
          setUpContract(ethersProvider);
        }
      }
      fetchMaticUsdRate();
    };
    init();

    // Fetch MATIC/USD rate every 5 minutes
    const intervalId = setInterval(fetchMaticUsdRate, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const setUpContract = async (ethersProvider) => {
    const signer = ethersProvider.getSigner();
    const lotteryContract = new ethers.Contract(CONTRACT_ADDRESS, PolyLotteryABI, signer);
    setContract(lotteryContract);
    setIsConnected(true);
    updateLotteryInfo(lotteryContract);
  };

  const connectWallet = async () => {
    try {
      const provider = await detectEthereumProvider();
      if (provider) {
        await provider.request({ method: 'eth_requestAccounts' });
        const ethersProvider = new ethers.providers.Web3Provider(provider);
        setUpContract(ethersProvider);
      } else {
        alert('Please install MetaMask!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Error connecting wallet. Please try again.');
    }
  };

  const updateLotteryInfo = async (lotteryContract) => {
    const balance = await lotteryContract.getLotteryBalance();
    setTotalPrize(ethers.utils.formatEther(balance));

    const price = await lotteryContract.ticketPrice();
    setTicketPrice(ethers.utils.formatEther(price));
  };

  const handleBuyTickets = async () => {
    if (!contract) return;
    try {
      const price = await contract.ticketPrice();
      const totalCost = price.mul(numTickets);
      const tx = await contract.buyTickets(numTickets, { value: totalCost });
      await tx.wait();
      alert('Tickets purchased successfully!');
      updateLotteryInfo(contract);
    } catch (error) {
      console.error('Error buying tickets:', error);
      alert('Error buying tickets. Please try again.');
    }
  };

  const fetchMaticUsdRate = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=matic-network&vs_currencies=usd');
      const data = await response.json();
      setMaticUsdRate(data['matic-network'].usd);
    } catch (error) {
      console.error('Error fetching MATIC/USD rate:', error);
    }
  };

  const formatUsd = (maticAmount) => {
    if (maticUsdRate === null) return 'Loading...';
    const usdAmount = parseFloat(maticAmount) * maticUsdRate;
    return `$${usdAmount.toFixed(2)}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      {!isConnected ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h2>Current Lottery Prize</h2>
            <p>{totalPrize} MATIC ({formatUsd(totalPrize)} USD)</p>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <h2>Ticket Price: {ticketPrice} MATIC ({formatUsd(ticketPrice)} USD)</h2>
            <input
              type="number"
              min="1"
              value={numTickets}
              onChange={(e) => setNumTickets(Math.max(1, parseInt(e.target.value)))}
              style={{ marginRight: '10px' }}
            />
            <button onClick={handleBuyTickets}>Buy Tickets</button>
          </div>
          <div>
            <h2>Previous Lottery Result</h2>
            {lastWinner.address ? (
              <>
                <p>Congratulations to {lastWinner.address}!</p>
                <p>Won {lastWinner.prize} MATIC ({formatUsd(lastWinner.prize)} USD)</p>
              </>
            ) : (
              <p>No previous winner information available.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Lottery;
