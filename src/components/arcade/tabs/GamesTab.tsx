import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useArcade } from '@/hooks/useArcade';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, Lock, Coins } from 'lucide-react';
import { toast } from 'sonner';

interface Game {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  token_cost: number;
  unlock_rule_json: Record<string, unknown> | null;
}

interface GamesTabProps {
  onPlayGame: (gameId: string, gameTitle: string) => void;
}

export function GamesTab({ onPlayGame }: GamesTabProps) {
  const { wallet, convertCoinsToTokens, refreshWallet } = useArcade();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGames = async () => {
      const { data, error } = await supabase
        .from('arcade_games')
        .select('*')
        .eq('is_active', true)
        .order('token_cost', { ascending: true });
      
      if (error) {
        console.error('Failed to load games:', error);
      } else {
        setGames((data || []).map(g => ({
          ...g,
          unlock_rule_json: g.unlock_rule_json as Record<string, unknown> | null,
        })));
      }
      setIsLoading(false);
    };
    
    loadGames();
  }, []);

  const handleConvertCoins = async () => {
    const coinsToConvert = Math.floor(wallet.coins_balance / 25) * 25;
    if (coinsToConvert < 25) {
      toast.error('Need at least 25 coins to convert');
      return;
    }
    
    const success = await convertCoinsToTokens(coinsToConvert);
    if (success) {
      toast.success(`Converted ${coinsToConvert} coins to ${coinsToConvert / 25} tokens!`);
    }
  };

  const isUnlocked = (game: Game) => {
    const rules = game.unlock_rule_json as { min_total_coins?: number } | null;
    const minCoins = rules?.min_total_coins || 0;
    return wallet.total_coins_earned >= minCoins;
  };

  const canPlay = (game: Game) => {
    return isUnlocked(game) && wallet.tokens_balance >= game.token_cost;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success/10 text-success';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'hard': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading games...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Token balance and convert */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tokens</p>
                <p className="text-2xl font-bold text-status-waiting">
                  🎮 {wallet.tokens_balance}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coins</p>
                <p className="text-2xl font-bold text-warning">
                  <Coins className="inline h-5 w-5 mr-1" />
                  {wallet.coins_balance}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleConvertCoins}
              disabled={wallet.coins_balance < 25}
              variant="outline"
            >
              Convert (25 coins = 1 token)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Games list */}
      <div className="grid gap-4">
        {games.map(game => {
          const unlocked = isUnlocked(game);
          const playable = canPlay(game);
          const rules = game.unlock_rule_json as { min_total_coins?: number } | null;
          const minCoins = rules?.min_total_coins || 0;
          
          return (
            <Card key={game.id} className={!unlocked ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {!unlocked && <Lock className="h-4 w-4" />}
                      {game.title}
                    </CardTitle>
                    <CardDescription>{game.description}</CardDescription>
                  </div>
                  <Badge className={getDifficultyColor(game.difficulty)}>
                    {game.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-status-waiting">
                      🎮 {game.token_cost} {game.token_cost === 1 ? 'token' : 'tokens'}
                    </span>
                    {!unlocked && minCoins > 0 && (
                      <span className="text-muted-foreground">
                        • Unlock at {minCoins} total coins earned
                      </span>
                    )}
                  </div>
                  
                  {unlocked ? (
                    playable ? (
                      <Button size="sm" onClick={() => onPlayGame(game.id, game.title)}>
                        <Gamepad2 className="h-4 w-4 mr-1" />
                        Play
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        Need {game.token_cost - wallet.tokens_balance} more tokens
                      </Button>
                    )
                  ) : (
                    <Button size="sm" variant="outline" disabled>
                      <Lock className="h-4 w-4 mr-1" />
                      Locked
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
