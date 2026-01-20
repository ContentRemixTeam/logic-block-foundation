import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FocusTimerTab } from '@/components/arcade/tabs/FocusTimerTab';
import { PetStoreTab } from '@/components/arcade/tabs/PetStoreTab';
import { GamesTab } from '@/components/arcade/tabs/GamesTab';
import { StatsTab } from '@/components/arcade/tabs/StatsTab';
import { DailyTop3Card } from '@/components/arcade/DailyTop3Card';
import { MemoryMatch } from '@/components/arcade/games/MemoryMatch';
import { useArcade } from '@/hooks/useArcade';
import { 
  Timer, 
  Target, 
  Sparkles, 
  Gamepad2, 
  BarChart3,
  Coins,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Arcade() {
  const { wallet, pet, settings, updateSettings, isLoading } = useArcade();
  const [activeTab, setActiveTab] = useState('focus');
  const [playingGame, setPlayingGame] = useState<{ id: string; title: string } | null>(null);

  const handlePlayGame = async (gameId: string, gameTitle: string) => {
    // For now, just launch Memory Match
    if (gameTitle.toLowerCase().includes('memory')) {
      setPlayingGame({ id: gameId, title: gameTitle });
    } else {
      toast.info('This game is coming soon!');
    }
  };

  const handleGameComplete = (score: number) => {
    toast.success(`Game complete! Score: ${score}`);
    setPlayingGame(null);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading arcade...</div>
        </div>
      </Layout>
    );
  }

  // If playing a game, show full screen game
  if (playingGame) {
    return (
      <Layout>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{playingGame.title}</h1>
            <Button variant="outline" onClick={() => setPlayingGame(null)}>
              Exit Game
            </Button>
          </div>
          <MemoryMatch onComplete={handleGameComplete} onClose={() => setPlayingGame(null)} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Focus & Rewards"
          description="Complete tasks, earn coins, and grow your pet!"
        />

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/10">
                <Coins className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coins</p>
                <p className="text-xl font-bold">{wallet.coins_balance}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-status-waiting/10">
                <Gamepad2 className="h-5 w-5 text-status-waiting" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tokens</p>
                <p className="text-xl font-bold">{wallet.tokens_balance}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/10">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-xl font-bold">{wallet.total_coins_earned}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10 dark:bg-primary/20">
                <span className="text-xl">
                  {pet?.stage === 'adult' ? '🎉' : pet ? '🥚' : '❓'}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pet</p>
                <p className="text-xl font-bold capitalize">
                  {pet?.stage === 'adult' ? pet.pet_type : pet ? pet.stage : 'None'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-xl">
            <TabsTrigger value="focus" className="gap-1.5">
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Focus</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-1.5">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Goals</span>
            </TabsTrigger>
            <TabsTrigger value="pets" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Pets</span>
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-1.5">
              <Gamepad2 className="h-4 w-4" />
              <span className="hidden sm:inline">Games</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="focus" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <FocusTimerTab />
              <div className="space-y-4">
                <DailyTop3Card />
                
                {/* Quick Settings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Quick Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reduce-motion" className="text-sm">
                        Reduce animations
                      </Label>
                      <Switch
                        id="reduce-motion"
                        checked={settings.arcade_reduce_motion}
                        onCheckedChange={(checked) => 
                          updateSettings({ arcade_reduce_motion: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sounds-off" className="text-sm">
                        Mute sounds
                      </Label>
                      <Switch
                        id="sounds-off"
                        checked={settings.arcade_sounds_off}
                        onCheckedChange={(checked) => 
                          updateSettings({ arcade_sounds_off: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <div className="max-w-lg">
              <DailyTop3Card />
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
                <CardDescription>
                  Focus on what matters most each day
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>1. Select your top 3 most important tasks for today</p>
                <p>2. Complete each task to earn +5 coins</p>
                <p>3. Completing all 3 tasks hatches your daily pet!</p>
                <p>4. Use the Pomodoro timer to stay focused</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pets">
            <PetStoreTab />
          </TabsContent>

          <TabsContent value="games">
            <GamesTab onPlayGame={handlePlayGame} />
          </TabsContent>

          <TabsContent value="stats">
            <StatsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
