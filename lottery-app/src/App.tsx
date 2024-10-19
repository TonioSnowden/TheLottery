import React, { useState, useEffect } from 'react'

function App() {
  const [numbers, setNumbers] = useState<number[]>([])
  const [winningNumber, setWinningNumber] = useState<number | null>(null)
  const [ticketCount, setTicketCount] = useState<number>(1)
  const [lastWinner, setLastWinner] = useState<string>('0x1234...5678')
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
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

  const buyTickets = () => {
    alert(`Bought ${ticketCount} ticket(s) for ${(ticketCount * 0.0001).toFixed(4)} ETH`)
  }

  const adjustTicketCount = (amount: number) => {
    setTicketCount((prev) => Math.max(1, prev + amount))
  }

  return (
    <div className="bg-black min-h-screen text-white flex flex-col items-center justify-start p-4 w-full">
      <h1 className="text-5xl font-bold mb-8 text-yellow-400 mt-8">TheLottery</h1>
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-semibold mb-2">Current Jackpot</h2>
          <p className="text-4xl font-bold text-green-400">17.4 ETH</p>
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
          >
            Buy Tickets ({(ticketCount * 0.0001).toFixed(4)} ETH)
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
          <p className="text-green-400 font-mono">{lastWinner}</p>
          <p className="text-xl font-bold mt-2">Congratulations!</p>
        </div>
      </div>
    </div>
  )
}

export default App
