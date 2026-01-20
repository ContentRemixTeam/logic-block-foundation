import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ArcadeWallet {
  coins_balance: number;
  tokens_balance: number;
  total_coins_earned: number;
}

interface DailyPet {
  id: string;
  pet_type: string;
  stage: 'sleeping' | 'baby' | 'teen' | 'adult';
  tasks_completed_today: number;
  hatched_at: string | null;
}

interface ArcadeSettings {
  arcade_enabled: boolean;
  arcade_reduce_motion: boolean;
  arcade_sounds_off: boolean;
  pomodoro_focus_minutes: number;
  pomodoro_break_minutes: number;
  pomodoro_auto_start_break: boolean;
  // Header widget visibility
  show_coin_counter: boolean;
  show_pet_widget: boolean;
  show_pomodoro_widget: boolean;
}

interface ArcadeContextValue {
  wallet: ArcadeWallet;
  pet: DailyPet | null;
  settings: ArcadeSettings;
  isLoading: boolean;
  refreshWallet: () => Promise<void>;
  refreshPet: () => Promise<void>;
  selectPet: (petType: string) => Promise<void>;
  convertCoinsToTokens: (amount: number) => Promise<boolean>;
  updateSettings: (updates: Partial<ArcadeSettings>) => Promise<void>;
}

const defaultWallet: ArcadeWallet = {
  coins_balance: 0,
  tokens_balance: 0,
  total_coins_earned: 0,
};

const defaultSettings: ArcadeSettings = {
  arcade_enabled: true,
  arcade_reduce_motion: false,
  arcade_sounds_off: true,
  pomodoro_focus_minutes: 25,
  pomodoro_break_minutes: 5,
  pomodoro_auto_start_break: false,
  show_coin_counter: true,
  show_pet_widget: true,
  show_pomodoro_widget: true,
};

const ArcadeContext = createContext<ArcadeContextValue | null>(null);

export function ArcadeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<ArcadeWallet>(defaultWallet);
  const [pet, setPet] = useState<DailyPet | null>(null);
  const [settings, setSettings] = useState<ArcadeSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const refreshWallet = useCallback(async () => {
    if (!user) return;
    
    try {
      let { data, error } = await supabase
        .from('arcade_wallet')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // Create wallet if it doesn't exist
      if (!data) {
        const { data: newWallet, error: insertError } = await supabase
          .from('arcade_wallet')
          .insert({
            user_id: user.id,
            coins_balance: 0,
            tokens_balance: 0,
            total_coins_earned: 0,
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        data = newWallet;
      }
      
      if (data) {
        setWallet({
          coins_balance: data.coins_balance || 0,
          tokens_balance: data.tokens_balance || 0,
          total_coins_earned: data.total_coins_earned || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  }, [user]);

  const refreshPet = useCallback(async () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const { data, error } = await supabase
        .from('arcade_daily_pet')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setPet({
          id: data.id,
          pet_type: data.pet_type,
          stage: data.stage as 'sleeping' | 'baby' | 'teen' | 'adult',
          tasks_completed_today: data.tasks_completed_today || 0,
          hatched_at: data.hatched_at,
        });
      } else {
        setPet(null);
      }
    } catch (err) {
      console.error('Failed to fetch pet:', err);
    }
  }, [user]);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('arcade_enabled, arcade_reduce_motion, arcade_sounds_off, pomodoro_focus_minutes, pomodoro_break_minutes, pomodoro_auto_start_break, show_coin_counter, show_pet_widget, show_pomodoro_widget')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setSettings({
          arcade_enabled: data.arcade_enabled ?? true,
          arcade_reduce_motion: data.arcade_reduce_motion ?? false,
          arcade_sounds_off: data.arcade_sounds_off ?? true,
          pomodoro_focus_minutes: data.pomodoro_focus_minutes ?? 25,
          pomodoro_break_minutes: data.pomodoro_break_minutes ?? 5,
          pomodoro_auto_start_break: data.pomodoro_auto_start_break ?? false,
          show_coin_counter: data.show_coin_counter ?? true,
          show_pet_widget: data.show_pet_widget ?? true,
          show_pomodoro_widget: data.show_pomodoro_widget ?? true,
        });
      }
    } catch (err) {
      console.error('Failed to fetch arcade settings:', err);
    }
  }, [user]);

  const selectPet = useCallback(async (petType: string) => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const { data, error } = await supabase
        .from('arcade_daily_pet')
        .upsert({
          user_id: user.id,
          date: today,
        pet_type: petType,
        stage: 'sleeping',
        tasks_completed_today: 0,
        }, {
          onConflict: 'user_id,date',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setPet({
          id: data.id,
          pet_type: data.pet_type,
          stage: data.stage as 'sleeping' | 'baby' | 'teen' | 'adult',
          tasks_completed_today: data.tasks_completed_today || 0,
          hatched_at: data.hatched_at,
        });
      }
    } catch (err) {
      console.error('Failed to select pet:', err);
    }
  }, [user]);

  const convertCoinsToTokens = useCallback(async (coinsToConvert: number): Promise<boolean> => {
    if (!user || coinsToConvert < 25) return false;
    
    const tokensToGain = Math.floor(coinsToConvert / 25);
    const actualCoinsUsed = tokensToGain * 25;
    
    if (wallet.coins_balance < actualCoinsUsed) return false;
    
    try {
      // Insert event
      await supabase.from('arcade_events').insert({
        user_id: user.id,
        event_type: 'tokens_purchased',
        coins_delta: -actualCoinsUsed,
        tokens_delta: tokensToGain,
        dedupe_key: `token_purchase:${Date.now()}`,
      });
      
      // Update wallet
      const { error } = await supabase
        .from('arcade_wallet')
        .update({
          coins_balance: wallet.coins_balance - actualCoinsUsed,
          tokens_balance: wallet.tokens_balance + tokensToGain,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      await refreshWallet();
      return true;
    } catch (err) {
      console.error('Failed to convert coins:', err);
      return false;
    }
  }, [user, wallet, refreshWallet]);

  const updateSettings = useCallback(async (updates: Partial<ArcadeSettings>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      setSettings(prev => ({ ...prev, ...updates }));
    } catch (err) {
      console.error('Failed to update arcade settings:', err);
    }
  }, [user]);

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([refreshWallet(), refreshPet(), loadSettings()]);
      setIsLoading(false);
    };
    
    if (user) {
      loadAll();
    }
  }, [user, refreshWallet, refreshPet, loadSettings]);

  return (
    <ArcadeContext.Provider value={{
      wallet,
      pet,
      settings,
      isLoading,
      refreshWallet,
      refreshPet,
      selectPet,
      convertCoinsToTokens,
      updateSettings,
    }}>
      {children}
    </ArcadeContext.Provider>
  );
}

export function useArcade() {
  const context = useContext(ArcadeContext);
  if (!context) {
    throw new Error('useArcade must be used within an ArcadeProvider');
  }
  return context;
}
