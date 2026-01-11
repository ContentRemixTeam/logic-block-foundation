import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw, Trophy } from 'lucide-react';

const EMOJIS = ['🎯', '🚀', '⭐', '💡', '🔥', '💎', '🎨', '🌟'];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryMatchProps {
  onComplete: (score: number) => void;
  onClose: () => void;
}

export function MemoryMatch({ onComplete, onClose }: MemoryMatchProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const initializeGame = () => {
    const shuffledEmojis = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffledEmojis);
    setFlippedCards([]);
    setMoves(0);
    setIsComplete(false);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const handleCardClick = (cardId: number) => {
    if (isProcessing) return;
    
    const card = cards.find(c => c.id === cardId);
    if (!card || card.isFlipped || card.isMatched) return;
    if (flippedCards.length >= 2) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    
    setCards(prev => prev.map(c => 
      c.id === cardId ? { ...c, isFlipped: true } : c
    ));

    if (newFlipped.length === 2) {
      setIsProcessing(true);
      setMoves(prev => prev + 1);
      
      const [first, second] = newFlipped;
      const firstCard = cards.find(c => c.id === first);
      const secondCard = cards.find(c => c.id === second);

      setTimeout(() => {
        if (firstCard?.emoji === secondCard?.emoji) {
          setCards(prev => prev.map(c => 
            c.id === first || c.id === second 
              ? { ...c, isMatched: true } 
              : c
          ));
        } else {
          setCards(prev => prev.map(c => 
            c.id === first || c.id === second 
              ? { ...c, isFlipped: false } 
              : c
          ));
        }
        setFlippedCards([]);
        setIsProcessing(false);
      }, 800);
    }
  };

  useEffect(() => {
    const allMatched = cards.length > 0 && cards.every(c => c.isMatched);
    if (allMatched && !isComplete) {
      setIsComplete(true);
      const score = Math.max(100 - (moves - 8) * 5, 10);
      onComplete(score);
    }
  }, [cards, isComplete, moves, onComplete]);

  if (isComplete) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Trophy className="h-16 w-16 mx-auto text-amber-500 mb-4" />
          <h3 className="text-2xl font-bold mb-2">Congratulations! 🎉</h3>
          <p className="text-muted-foreground mb-4">
            You completed the game in {moves} moves!
          </p>
          <div className="flex justify-center gap-3">
            <Button onClick={initializeGame} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Play Again
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Moves: {moves}</p>
        <Button size="sm" variant="ghost" onClick={initializeGame}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Reset
        </Button>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            disabled={card.isFlipped || card.isMatched || isProcessing}
            className={`
              aspect-square rounded-lg text-2xl flex items-center justify-center
              transition-all duration-200 transform
              ${card.isFlipped || card.isMatched 
                ? 'bg-primary/10 scale-100' 
                : 'bg-muted hover:bg-muted/80 hover:scale-105'
              }
              ${card.isMatched ? 'opacity-60' : ''}
            `}
          >
            {card.isFlipped || card.isMatched ? card.emoji : '?'}
          </button>
        ))}
      </div>
    </div>
  );
}
