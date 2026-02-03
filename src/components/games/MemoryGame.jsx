'use client';
import { useState, useEffect } from 'react';

const cardEmojis = ['🍎', '🍌', '🍇', '🍒', '🍓', '🍍'];

const createShuffledCards = () => 
  [...cardEmojis, ...cardEmojis]
    .sort(() => Math.random() - 0.5)
    .map((content, i) => ({ id: i, content, isFlipped: false, isMatched: false }));

export default function MemoryGame({ onEnd }) {
  const [cards, setCards] = useState(createShuffledCards());
  const [flippedCardIds, setFlippedCardIds] = useState([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const allMatched = cards.length > 0 && cards.every(card => card.isMatched);
    if (allMatched) {
      onEnd(10);
    }
  }, [cards, onEnd]);

  useEffect(() => {
    if (flippedCardIds.length === 2) {
      setIsChecking(true);
      const [firstId, secondId] = flippedCardIds;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard.content === secondCard.content) {
        setCards(prev => prev.map(card => 
          (card.id === firstId || card.id === secondId) ? { ...card, isMatched: true } : card
        ));
        setFlippedCardIds([]);
        setIsChecking(false);
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(card => 
            (card.id === firstId || card.id === secondId) ? { ...card, isFlipped: false } : card
          ));
          setFlippedCardIds([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  }, [flippedCardIds, cards]);

  function handleCardClick(card) {
    if (isChecking || card.isFlipped || card.isMatched || flippedCardIds.length >= 2) return;
    
    setCards(prev => prev.map(c => (c.id === card.id ? { ...c, isFlipped: true } : c)));
    setFlippedCardIds(prev => [...prev, card.id]);
  }

  function resetGame() {
    setCards(createShuffledCards());
    setFlippedCardIds([]);
    setIsChecking(false);
  }

  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold mb-4">Memory Match</h1>
      <div className="grid grid-cols-4 gap-4 max-w-xs mx-auto">
        {cards.map(card => (
          <div 
            key={card.id} 
            onClick={() => handleCardClick(card)} 
            className={`w-16 h-16 border rounded-lg flex items-center justify-center text-3xl cursor-pointer ${card.isFlipped || card.isMatched ? 'bg-blue-300' : 'bg-gray-300'}`}>
            {(card.isFlipped || card.isMatched) ? card.content : '?'}
          </div>
        ))}
      </div>
      {cards.length > 0 && cards.every(c => c.isMatched) && (
        <p className="text-xl font-bold mt-4">You won!</p>
      )}
      <button onClick={resetGame} className="mt-4 px-4 py-2 border rounded-lg">Reset Game</button>
    </div>
  );
}