import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string | Date;
  onComplete?: () => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const calculateTimeLeft = (target: Date): TimeLeft => {
  const difference = target.getTime() - new Date().getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
};

export const CountdownTimer = ({ targetDate, onComplete }: CountdownTimerProps) => {
  const target = new Date(targetDate);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(target));
  
  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(target);
      setTimeLeft(newTimeLeft);
      
      // Check if countdown complete
      if (newTimeLeft.days === 0 && newTimeLeft.hours === 0 && 
          newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        onComplete?.();
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [target, onComplete]);
  
  return (
    <div className="countdown-timer flex gap-3 sm:gap-4 justify-center">
      {timeLeft.days > 0 && (
        <div className="countdown-section flex flex-col items-center min-w-[50px] sm:min-w-[60px]">
          <span className="countdown-number text-2xl sm:text-3xl font-bold text-primary">
            {timeLeft.days}
          </span>
          <span className="countdown-label text-xs text-muted-foreground uppercase tracking-wide">
            days
          </span>
        </div>
      )}
      <div className="countdown-section flex flex-col items-center min-w-[50px] sm:min-w-[60px]">
        <span className="countdown-number text-2xl sm:text-3xl font-bold text-primary">
          {timeLeft.hours.toString().padStart(2, '0')}
        </span>
        <span className="countdown-label text-xs text-muted-foreground uppercase tracking-wide">
          hours
        </span>
      </div>
      <div className="countdown-section flex flex-col items-center min-w-[50px] sm:min-w-[60px]">
        <span className="countdown-number text-2xl sm:text-3xl font-bold text-primary">
          {timeLeft.minutes.toString().padStart(2, '0')}
        </span>
        <span className="countdown-label text-xs text-muted-foreground uppercase tracking-wide">
          min
        </span>
      </div>
      {timeLeft.days === 0 && (
        <div className="countdown-section flex flex-col items-center min-w-[50px] sm:min-w-[60px]">
          <span className="countdown-number text-2xl sm:text-3xl font-bold text-primary animate-pulse">
            {timeLeft.seconds.toString().padStart(2, '0')}
          </span>
          <span className="countdown-label text-xs text-muted-foreground uppercase tracking-wide">
            sec
          </span>
        </div>
      )}
    </div>
  );
};
