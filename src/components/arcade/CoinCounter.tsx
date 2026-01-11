import { Coins } from 'lucide-react';
import { useArcade } from '@/hooks/useArcade';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CoinCounterProps {
  onClick: () => void;
}

export function CoinCounter({ onClick }: CoinCounterProps) {
  const { wallet } = useArcade();
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className="flex items-center gap-1.5 px-2 h-8 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
        >
          <Coins className="h-4 w-4" />
          <span className="font-medium tabular-nums">{wallet.coins_balance}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>You have {wallet.coins_balance} coins</p>
        <p className="text-xs text-muted-foreground">Click to open Arcade</p>
      </TooltipContent>
    </Tooltip>
  );
}
