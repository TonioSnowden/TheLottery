import React, { useEffect, useState } from 'react';
import coin from '../../UI/svg/coin.svg';

interface FallingCoinProps {
  left: number;
}

const FallingCoin: React.FC<FallingCoinProps> = ({ left }) => {
  const [top, setTop] = useState(-20);

  useEffect(() => {
    const interval = setInterval(() => {
      setTop((prevTop) => {
        if (prevTop > window.innerHeight) {
          clearInterval(interval);
          return -20;
        }
        return prevTop + 5;
      });
    }, 17);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="absolute"
      style={{ left: `${left}px`, top: `${top}px`, width: '40px', height: '40px' }}
    >
        <img src={coin} alt="coin" className="w-full h-full" />
    </div>
  );
};

export default FallingCoin;