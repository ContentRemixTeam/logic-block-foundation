import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ActivePromotion {
  id: string;
  type: 'launch' | 'flash_sale' | 'webinar' | 'summit' | 'lead_magnet' | 'product';
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  description?: string;
}

/**
 * Aggregates all active promotions from multiple tables:
 * - launches
 * - flash_sales
 * - user_products
 * 
 * Returns promotions that are currently active or upcoming (within 30 days)
 */
export function useActivePromotions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['active-promotions', user?.id],
    queryFn: async (): Promise<ActivePromotion[]> => {
      if (!user) return [];

      const promotions: ActivePromotion[] = [];
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch active launches (cart_opens, cart_closes are the date fields)
      const { data: launches } = await supabase
        .from('launches')
        .select('id, name, cart_opens, cart_closes')
        .eq('user_id', user.id)
        .or(`cart_opens.gte.${today},cart_closes.gte.${today}`)
        .order('cart_opens', { ascending: true });

      if (launches) {
        launches.forEach(launch => {
          promotions.push({
            id: launch.id,
            type: 'launch',
            name: launch.name || 'Untitled Launch',
            startDate: launch.cart_opens,
            endDate: launch.cart_closes,
            status: 'active',
          });
        });
      }

      // Fetch active flash sales
      const { data: flashSales } = await supabase
        .from('flash_sales')
        .select('id, name, start_date, end_date')
        .eq('user_id', user.id)
        .or(`start_date.gte.${today},end_date.gte.${today}`)
        .order('start_date', { ascending: true });

      if (flashSales) {
        flashSales.forEach(sale => {
          promotions.push({
            id: sale.id,
            type: 'flash_sale',
            name: sale.name || 'Untitled Flash Sale',
            startDate: sale.start_date,
            endDate: sale.end_date,
            status: 'active',
          });
        });
      }

      // Fetch user products (product_name is the name field)
      const { data: products } = await supabase
        .from('user_products')
        .select('id, product_name, description')
        .eq('user_id', user.id)
        .order('product_name', { ascending: true });

      if (products) {
        products.forEach(product => {
          promotions.push({
            id: product.id,
            type: 'product',
            name: product.product_name,
            startDate: null,
            endDate: null,
            status: 'active',
            description: product.description || undefined,
          });
        });
      }

      return promotions;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get a summary of promotions by type
 */
export function usePromotionsSummary() {
  const { data: promotions, isLoading, error } = useActivePromotions();

  const summary = {
    launches: promotions?.filter(p => p.type === 'launch') || [],
    flashSales: promotions?.filter(p => p.type === 'flash_sale') || [],
    webinars: promotions?.filter(p => p.type === 'webinar') || [],
    summits: promotions?.filter(p => p.type === 'summit') || [],
    leadMagnets: promotions?.filter(p => p.type === 'lead_magnet') || [],
    products: promotions?.filter(p => p.type === 'product') || [],
    hasActivePromotion: (promotions?.length || 0) > 0,
    totalCount: promotions?.length || 0,
  };

  return { summary, isLoading, error };
}
