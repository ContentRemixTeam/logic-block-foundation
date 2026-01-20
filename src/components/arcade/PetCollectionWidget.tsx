import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HatchedPet {
  id: string;
  pet_type: string;
  pet_emoji: string;
  hatched_at: string;
}

export function PetCollectionWidget() {
  const { user } = useAuth();
  const [pets, setPets] = useState<HatchedPet[]>([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const loadTodaysPets = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('hatched_pets')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('hatched_at', { ascending: true });

      if (!error && data) {
        setPets(data);
      }
    };

    loadTodaysPets();
    
    // Subscribe to changes
    const channel = supabase
      .channel('hatched_pets_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'hatched_pets',
      }, () => {
        loadTodaysPets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, today]);

  if (pets.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 gap-1 text-sm"
          >
            <span className="flex items-center">
              {pets.slice(0, 3).map((pet, i) => (
                <span 
                  key={pet.id} 
                  className="text-base"
                  style={{ marginLeft: i > 0 ? '-4px' : 0 }}
                >
                  {pet.pet_emoji}
                </span>
              ))}
              {pets.length > 3 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{pets.length - 3}
                </span>
              )}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Today's Pets: {pets.length} hatched</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
