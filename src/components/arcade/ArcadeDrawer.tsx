import { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useArcade } from '@/hooks/useArcade';
import { GamesTab } from './tabs/GamesTab';
import { PetStoreTab } from './tabs/PetStoreTab';
import { FocusTimerTab } from './tabs/FocusTimerTab';
import { StatsTab } from './tabs/StatsTab';
import { MemoryMatch } from './games/MemoryMatch';
import { Gamepad2, Cat, Timer, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

interface ArcadeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: string;
}

export function ArcadeDrawer({ open, onOpenChange, defaultTab = 'games' }: ArcadeDrawerProps) {
  const { user } = useAuth();
  const { wallet, refreshWallet } = useArcade();
  const [activeGame, setActiveGame] = useState<{ id: string; title: string } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handlePlayGame = async (gameId: string, gameTitle: string) => {
    if (!user) return;
    
    // Get game info for token cost
    const { data: game } = await supabase
      .from('arcade_games')
      .select('token_cost')
      .eq('id', gameId)
      .single();
    
    if (!game) {
      toast.error('Game not found');
      return;
    }
    
    if (wallet.tokens_balance < game.token_cost) {
      toast.error('Not enough tokens!');
      return;
    }
    
    try {
      // Create game session
      const { data: session, error: sessionError } = await supabase
        .from('arcade_game_sessions')
        .insert({
          user_id: user.id,
          game_id: gameId,
        })
        .select()
        .single();
      
      if (sessionError) throw sessionError;
      
      // Deduct tokens
      const dedupeKey = `game_session:${session.id}`;
      await supabase.from('arcade_events').insert({
        user_id: user.id,
        event_type: 'game_played',
        tokens_delta: -game.token_cost,
        metadata: { game_id: gameId, game_title: gameTitle },
        dedupe_key: dedupeKey,
      });
      
      await supabase
        .from('arcade_wallet')
        .update({
          tokens_balance: wallet.tokens_balance - game.token_cost,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      
      await refreshWallet();
      setSessionId(session.id);
      setActiveGame({ id: gameId, title: gameTitle });
    } catch (err) {
      console.error('Failed to start game:', err);
      toast.error('Failed to start game');
    }
  };

  const handleGameComplete = async (score: number) => {
    if (!user || !sessionId) return;
    
    try {
      await supabase
        .from('arcade_game_sessions')
        .update({
          ended_at: new Date().toISOString(),
          score,
        })
        .eq('id', sessionId);
      
      toast.success(`Game complete! Score: ${score}`);
    } catch (err) {
      console.error('Failed to save game score:', err);
    }
  };

  const handleCloseGame = () => {
    setActiveGame(null);
    setSessionId(null);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Task Arcade
          </DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-6 overflow-y-auto">
          {activeGame ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{activeGame.title}</h3>
              {activeGame.title === 'Memory Match' && (
                <MemoryMatch onComplete={handleGameComplete} onClose={handleCloseGame} />
              )}
              {activeGame.title !== 'Memory Match' && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>This game is coming soon!</p>
                  <button 
                    onClick={handleCloseGame}
                    className="text-primary underline mt-2"
                  >
                    Go back
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="games" className="flex items-center gap-1.5">
                  <Gamepad2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Games</span>
                </TabsTrigger>
                <TabsTrigger value="pets" className="flex items-center gap-1.5">
                  <Cat className="h-4 w-4" />
                  <span className="hidden sm:inline">Pets</span>
                </TabsTrigger>
                <TabsTrigger value="focus" className="flex items-center gap-1.5">
                  <Timer className="h-4 w-4" />
                  <span className="hidden sm:inline">Focus</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Stats</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="games" className="mt-4">
                <GamesTab onPlayGame={handlePlayGame} />
              </TabsContent>
              
              <TabsContent value="pets" className="mt-4">
                <PetStoreTab />
              </TabsContent>
              
              <TabsContent value="focus" className="mt-4">
                <FocusTimerTab />
              </TabsContent>
              
              <TabsContent value="stats" className="mt-4">
                <StatsTab />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
