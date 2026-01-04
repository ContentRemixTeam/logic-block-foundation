import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/system/LoadingState";
import { Trophy, Lightbulb, Users } from "lucide-react";
import { format } from "date-fns";

interface CommunityReview {
  review_id: string;
  wins: string | null;
  challenges: string | null;
  adjustments: string | null;
  created_at: string;
  week_id: string | null;
}

export default function Community() {
  const [reviews, setReviews] = useState<CommunityReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommunityReviews();
  }, []);

  const loadCommunityReviews = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-community-reviews');
      
      if (error) throw error;
      
      setReviews(data?.reviews || []);
    } catch (error) {
      console.error('Error loading community reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Loading community reviews..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Celebration Wall</h1>
            <p className="text-muted-foreground">
              See what others are learning and celebrating
            </p>
          </div>
        </div>

        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No shared reviews yet</h3>
              <p className="text-muted-foreground">
                Be the first to share your weekly wins and lessons with the community!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <Card key={review.review_id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-muted-foreground">
                      {format(new Date(review.created_at), 'MMM d, yyyy')}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {review.wins && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Trophy className="h-4 w-4" />
                        Wins
                      </div>
                      <p className="text-sm text-foreground pl-6">{review.wins}</p>
                    </div>
                  )}
                  
                  {review.adjustments && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-amber-500">
                        <Lightbulb className="h-4 w-4" />
                        Lessons Learned
                      </div>
                      <p className="text-sm text-foreground pl-6">{review.adjustments}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
