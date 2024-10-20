import React, { useState, useEffect } from 'react'
import FallingCoin from './components/UI/FallingCoin'
import PolyLotteryABI from './json/PolyLotteryABI.json'
import lastWinnerData from './json/lastWinner.json'
import lotteryInfoData from './json/lotteryInfo.json'
import { useEnsName } from 'wagmi'
import logo from './assets/logo.svg'
import './AnimatedBackground.css';

import { DynamicWidget, useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { WalletClient, formatEther } from 'viem'
import { getContract } from 'viem'

const CONTRACT_ADDRESS = '0xf4e53F35b1e8665928518D1511BB1Ff3Fa30B791'

function App() {
  const [winningNumber, setWinningNumber] = useState<number | null>(null)
  const [ticketCount, setTicketCount] = useState<number>(1)
  const [prevTicketCount, setPrevTicketCount] = useState<number>(1)
  const [lastWinner, setLastWinner] = useState<string>(lastWinnerData.address)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [fallingCoins, setFallingCoins] = useState<{ id: number; left: number }[]>([])
  const [totalPrize, setTotalPrize] = useState(lotteryInfoData.currentJackpot)
  const [ticketPrice, setTicketPrice] = useState(lotteryInfoData.ticketPrice)
  const [contract, setContract] = useState<Contract | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const isLoggedIn = useIsLoggedIn()
  const {  primaryWallet } = useDynamicContext()
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (isLoggedIn) {
        if (primaryWallet && isEthereumWallet(primaryWallet)) {
        const walletClient = await primaryWallet.getWalletClient()

        setUpContract(walletClient)
      }
      }
    }
    init()

    const timer = setInterval(() => {
      const now = new Date()
      const nextSunday = new Date(now)
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7)
      nextSunday.setHours(7, 0, 0, 0)
      
      const timeDiff = nextSunday.getTime() - now.getTime()
      
      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
        
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
      } else {
        setTimeLeft('Drawing now!')
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const setUpContract = async (walletClient: WalletClient) => {
    const lotteryContract = getContract({
      address: CONTRACT_ADDRESS,
      abi: PolyLotteryABI,
      client: walletClient,
    })
    
    setContract(lotteryContract)
    setIsConnected(true)
    updateLotteryInfo(lotteryContract)
  }


  const updateLotteryInfo = async (lotteryContract: Contract) => {
    const balance = await lotteryContract.read.getLotteryBalance()
    setTotalPrize(formatEther(balance.toString()))

    const price = await lotteryContract.read.ticketPrice()
    setTicketPrice(formatEther(price.toString()))
  }

  const buyTickets = async () => {
    if (!contract) return
    try {
      const price = await contract.read.ticketPrice()
      const totalCost = price.mul(ticketCount)
      const tx = await contract.write.buyTickets(ticketCount, { value: totalCost })
      await tx.wait()
      alert('Tickets purchased successfully!')
      updateLotteryInfo(contract)
    } catch (error) {
      console.error('Error buying tickets:', error)
      alert('Error buying tickets. Please try again.')
    }
  }

  const adjustTicketCount = (amount: number) => {
    setPrevTicketCount(ticketCount);
    setTicketCount((prev) => Math.max(1, prev + amount));
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 150); // Reset after 0.1 seconds
    if (amount > 0) {
      const coinCount = Math.floor(Math.random() * 4) + 1;
      const newCoins = Array.from({ length: coinCount }, () => ({
        id: Date.now() + Math.random(),
        left: Math.random() * window.innerWidth,
      }));
      setFallingCoins((prevCoins) => [...prevCoins, ...newCoins]);
    }
  };

  const removeCoin = (id: number) => {
    setFallingCoins((prevCoins) => prevCoins.filter((coin) => coin.id !== id));
  };

  const { data: winnerEnsName } = useEnsName({
    address: lastWinner as `0x${string}`,
  })

  return (
    <div className="animated-background min-h-screen text-white flex flex-col items-center justify-start p-4 w-full relative overflow-hidden">
      <img src={logo} alt="TheLottery Logo" className="absolute top-8 left-8 w-20 h-20" />
      {fallingCoins.map((coin) => (
        <FallingCoin key={coin.id} left={coin.left} onFinish={() => removeCoin(coin.id)} />
      ))}
      <div className="absolute top-8 right-8">
        <DynamicWidget />
      </div>
      <h1 className="text-6xl font-bold mb-16 text-yellow-400 mt-5">TheLottery</h1>
      <div className="bg-black p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold mb-2">Next Draw</h2>
          <p className="text-3xl font-bold text-red-400">{timeLeft}</p>
        </div>
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-semibold mb-2">Current Jackpot</h2>
          <p className="text-4xl font-bold text-green-400">{totalPrize} MATIC</p>
        </div>
        <div className="flex justify-between mb-6 items-end">
          <div>
            <label htmlFor="ticketCount" className="block text-lg mb-2">Number of Tickets:</label>
            <div className="flex items-center">
              <button
                className="bg-yellow-400 text-black font-bold px-4 py-2 rounded-full hover:bg-yellow-500 transition-colors mr-2"
                onClick={() => adjustTicketCount(-1)}
              >
                -
              </button>
              <button
                className="bg-yellow-400 text-black font-bold px-4 py-2 rounded-full hover:bg-yellow-500 transition-colors mr-2"
                onClick={() => adjustTicketCount(1)}
              >
                +
              </button>
              <span 
                className={`text-3xl font-bold transition-all duration-100 ${
                  isAnimating
                    ? ticketCount > prevTicketCount
                      ? 'text-blue-500 text-4xl'
                      : ticketCount < prevTicketCount
                      ? 'text-red-500 text-xl'
                      : ''
                    : 'text-white scale-100'
                }`}
              >
                {ticketCount}
              </span>
            </div>
          </div>
          <button
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-2 rounded font-bold"
            onClick={buyTickets}
            disabled={!isConnected}
          >
            Buy Tickets ({(ticketCount * parseFloat(ticketPrice)).toFixed(4)} MATIC)
          </button>
        </div>
          {winningNumber !== null && (
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-semibold mb-2">Winning Number:</h2>
              <div className="bg-yellow-400 text-black w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mx-auto">
                {winningNumber}
              </div>
            </div>
          )}
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Last Winner</h2>
            <p className="text-green-400 font-mono">
              {winnerEnsName || lastWinner}
            </p>
            <p className="text-xl font-bold mt-2">Congratulations!</p>
          </div>
        </div>
      </div>
  )
}

export default App
