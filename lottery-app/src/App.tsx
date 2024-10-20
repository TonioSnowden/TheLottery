import React, { useState, useEffect } from 'react'
import FallingCoin from './components/UI/FallingCoin'
import PolyLotteryABI from './json/PolyLotteryABI.json'
import lastWinnerData from './json/lastWinner.json'
import lotteryInfoData from './json/lotteryInfo.json'
import { useEnsName } from 'wagmi'
import logo from './assets/logo.svg'

import { DynamicWidget, useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { isEthereumWallet } from '@dynamic-labs/ethereum'
import { WalletClient, formatEther } from 'viem'
import { getContract } from 'viem'

const CONTRACT_ADDRESS = '0xf4e53F35b1e8665928518D1511BB1Ff3Fa30B791'

function App() {
  const [winningNumber, setWinningNumber] = useState<number | null>(null)
  const [ticketCount, setTicketCount] = useState<number>(1)
  const [lastWinner, setLastWinner] = useState<string>(lastWinnerData.address)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [fallingCoins, setFallingCoins] = useState<{ id: number; left: number }[]>([])
  const [totalPrize, setTotalPrize] = useState(lotteryInfoData.currentJackpot)
  const [ticketPrice, setTicketPrice] = useState(lotteryInfoData.ticketPrice)
  const [contract, setContract] = useState<Contract | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const isLoggedIn = useIsLoggedIn()
  const {  primaryWallet } = useDynamicContext()

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
    setTicketCount((prev) => Math.max(1, prev + amount));
    if (amount > 0) {
      const coinCount = Math.floor(Math.random() * 4) + 1; // Random number between 1 and 4
      const newCoins = Array.from({ length: coinCount }, () => ({
        id: Date.now() + Math.random(), // Ensure unique IDs
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
    <div className="bg-black min-h-screen text-white flex flex-col items-center justify-start p-4 w-full relative overflow-hidden">
      <img src={logo} alt="TheLottery Logo" className="absolute top-4 left-4 w-16 h-16" />
      {fallingCoins.map((coin) => (
        <FallingCoin key={coin.id} left={coin.left} onFinish={() => removeCoin(coin.id)} />
      ))}
      <div className="absolute top-4 right-4">
        <DynamicWidget />
      </div>
      <h1 className="text-5xl font-bold mb-8 text-yellow-400 mt-8">TheLottery</h1>
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-semibold mb-2">Current Jackpot</h2>
          <p className="text-4xl font-bold text-green-400">{totalPrize} MATIC</p>
        </div>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-semibold mb-2">Next Draw</h2>
          <p className="text-3xl font-bold text-blue-400">{timeLeft}</p>
        </div>
        <div className="flex justify-between mb-6 items-end">
          <div>
            <label htmlFor="ticketCount" className="block mb-2">Number of Tickets:</label>
            <div className="flex items-center">
              <button
                className="bg-gray-700 text-white px-3 py-2 rounded-l"
                onClick={() => adjustTicketCount(-1)}
              >
                -
              </button>
              <input
                type="number"
                id="ticketCount"
                value={ticketCount}
                onChange={(e) => {
                  const value = parseInt(e.target.value)
                  if (!isNaN(value) && value >= 1) {
                    setTicketCount(value)
                  }
                }}
                className="bg-gray-700 text-white px-3 py-2 w-16 text-center"
                readOnly
              />
              <button
                className="bg-gray-700 text-white px-3 py-2 rounded-r"
                onClick={() => adjustTicketCount(1)}
              >
                +
              </button>
            </div>
          </div>
          <button
            className="bg-yellow-500 text-black px-6 py-2 rounded font-bold"
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
