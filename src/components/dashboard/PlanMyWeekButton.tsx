import { Link } from 'react-router-dom';
import { Calendar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PlanMyWeekButton() {
  return (
    <Link to="/weekly-plan" className="block">
      <Button 
        className="w-full bg-gradient-to-r from-[hsl(330,81%,54%)] to-[hsl(330,81%,60%)] 
          hover:from-[hsl(330,81%,48%)] hover:to-[hsl(330,81%,54%)] 
          text-white rounded-full py-6 text-base font-semibold 
          shadow-lg hover:shadow-xl transition-all duration-200
          hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]
          flex items-center justify-center gap-2"
      >
        <Calendar className="h-5 w-5" />
        Plan My Week
        <ArrowRight className="h-4 w-4 ml-1" />
      </Button>
    </Link>
  );
}
