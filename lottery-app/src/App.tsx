import React, { useState } from 'react'

function App() {
  const [numbers, setNumbers] = useState<number[]>([])
  const [winningNumber, setWinningNumber] = useState<number | null>(null)
  const [ticketCount, setTicketCount] = useState<number>(1)
  const [lastWinner, setLastWinner] = useState<string>('0x1234...5678')

  const generateNumbers = () => {
    const newNumbers = Array.from({ length: 6 }, () => Math.floor(Math.random() * 49) + 1)
    setNumbers(newNumbers)
  }

  const drawWinner = () => {
    if (numbers.length === 0) {
      alert('Please generate numbers first!')
      return
    }
    const winner = numbers[Math.floor(Math.random() * numbers.length)]
    setWinningNumber(winner)
    setLastWinner('0x' + Math.random().toString(16).substr(2, 40))
  }

  const buyTickets = () => {
    alert(`Bought ${ticketCount} ticket(s) for ${(ticketCount * 0.0001).toFixed(4)} ETH`)
  }

  return (
    <div className="bg-black min-h-screen text-white flex flex-col items-center justify-center p-4 w-full">
      <h1 className="text-5xl font-bold mb-8 text-yellow-400">TheLottery</h1>
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-2xl">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-semibold mb-2">Current Jackpot</h2>
          <p className="text-4xl font-bold text-green-400">17.4 ETH</p>
        </div>
        <div className="flex justify-between mb-6">
          <div>
            <label htmlFor="ticketCount" className="block mb-2">Number of Tickets:</label>
            <input
              type="number"
              id="ticketCount"
              min="1"
              value={ticketCount}
              onChange={(e) => setTicketCount(Math.max(1, parseInt(e.target.value)))}
              className="bg-gray-700 text-white px-3 py-2 rounded"
            />
          </div>
          <button
            className="bg-yellow-500 text-black px-6 py-2 rounded font-bold self-end"
            onClick={buyTickets}
          >
            Buy Tickets ({(ticketCount * 0.0001).toFixed(4)} ETH)
          </button>
        </div>
        <div className="flex space-x-4 mb-6">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded flex-1"
            onClick={generateNumbers}
          >
            Generate Numbers
          </button>
          <button
            className="bg-green-500 text-white px-4 py-2 rounded flex-1"
            onClick={drawWinner}
          >
            Draw Winner
          </button>
        </div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Your Numbers:</h2>
          <div className="flex justify-center space-x-2">
            {numbers.map((number, index) => (
              <div key={index} className="bg-gray-600 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold">
                {number}
              </div>
            ))}
          </div>
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
