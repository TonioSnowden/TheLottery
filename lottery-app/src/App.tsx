import React, { useState } from 'react'

function App() {
  const [numbers, setNumbers] = useState<number[]>([])
  const [winningNumber, setWinningNumber] = useState<number | null>(null)

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
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">Lottery App</h1>
      <div className="bg-white p-8 rounded-lg shadow-md">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded mb-4 mr-4"
          onClick={generateNumbers}
        >
          Generate Numbers
        </button>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded mb-4"
          onClick={drawWinner}
        >
          Draw Winner
        </button>
        <div className="mt-4">
          <h2 className="text-2xl font-semibold mb-2">Generated Numbers:</h2>
          <div className="flex space-x-2">
            {numbers.map((number, index) => (
              <div key={index} className="bg-gray-200 w-10 h-10 rounded-full flex items-center justify-center">
                {number}
              </div>
            ))}
          </div>
        </div>
        {winningNumber !== null && (
          <div className="mt-4">
            <h2 className="text-2xl font-semibold mb-2">Winning Number:</h2>
            <div className="bg-yellow-300 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold">
              {winningNumber}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App