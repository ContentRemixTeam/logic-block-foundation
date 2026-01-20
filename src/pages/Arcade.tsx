import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FocusTimerTab } from '@/components/arcade/tabs/FocusTimerTab';
import { PetStoreTab } from '@/components/arcade/tabs/PetStoreTab';
import { StatsTab } from '@/components/arcade/tabs/StatsTab';
import { PetGrowthCard } from '@/components/arcade/PetGrowthCard';
import { TodaysReflections } from '@/components/arcade/TodaysReflections';
import { useArcade } from '@/hooks/useArcade';
import { 
  Timer, 
  Target, 
  Sparkles, 
  BarChart3,
  Coins,
  Settings,
  CheckSquare,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function Arcade() {
  const { wallet, pet, settings, updateSettings, isLoading } = useArcade();
  const [activeTab, setActiveTab] = useState('tasks');

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading arcade...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Focus & Rewards"
          description="Complete tasks, earn coins, and grow your pets!"
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
                <p className="text-sm text-muted-foreground">Current Pet</p>
                <p className="text-xl font-bold capitalize">
                  {pet?.stage === 'adult' ? pet.pet_type : pet ? pet.stage : 'None'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-secondary/50">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hatched Today</p>
                <p className="text-xl font-bold">{pet?.pets_hatched_today || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="tasks" className="gap-1.5">
              <CheckSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="focus" className="gap-1.5">
              <Timer className="h-4 w-4" />
              <span className="hidden sm:inline">Focus</span>
            </TabsTrigger>
            <TabsTrigger value="pets" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Pets</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <PetGrowthCard />
              </div>
              <div className="space-y-4">
                <TodaysReflections />
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">How It Works</CardTitle>
                    <CardDescription>
                      Focus on what matters most each day
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Enter your top 3 tasks for today</p>
                    <p>2. Complete each task to grow your pet (+5 coins)</p>
                    <p>3. Reflect on what went well (+2 bonus coins)</p>
                    <p>4. Hatch multiple pets in a day!</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="focus" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <FocusTimerTab />
              <div className="space-y-4">
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

          <TabsContent value="pets">
            <PetStoreTab />
          </TabsContent>

          <TabsContent value="stats">
            <StatsTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
