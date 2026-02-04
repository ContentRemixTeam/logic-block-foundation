import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PipToolbarProps {
  pipWindow: Window;
  taskText: string;
  timeRemaining: number;
  totalDuration: number;
  isRunning: boolean;
  isPaused: boolean;
  formatTime: (seconds: number) => string;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onAddMinutes: (minutes: number) => void;
  onComplete: () => void;
}

export function PipToolbar({
  pipWindow,
  taskText,
  timeRemaining,
  totalDuration,
  isRunning,
  isPaused,
  formatTime,
  onPause,
  onResume,
  onStop,
  onAddMinutes,
  onComplete,
}: PipToolbarProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create container in PiP window
    const div = pipWindow.document.createElement('div');
    div.id = 'pip-root';
    pipWindow.document.body.appendChild(div);
    
    // Add some base styles
    const style = pipWindow.document.createElement('style');
    style.textContent = `
      body {
        margin: 0;
        padding: 0;
        font-family: system-ui, -apple-system, sans-serif;
        background: linear-gradient(135deg, hsl(222 47% 11%) 0%, hsl(222 47% 8%) 100%);
        color: white;
        overflow: hidden;
      }
      #pip-root {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 12px;
        box-sizing: border-box;
      }
      .pip-timer {
        font-size: 2.5rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        text-align: center;
        line-height: 1;
        color: hsl(142 76% 56%);
      }
      .pip-timer.warning {
        color: hsl(45 93% 47%);
      }
      .pip-timer.urgent {
        color: hsl(0 84% 60%);
        animation: pulse 1s infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      .pip-task {
        font-size: 0.75rem;
        text-align: center;
        color: rgba(255,255,255,0.7);
        margin-top: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .pip-controls {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-top: auto;
      }
      .pip-btn {
        padding: 6px 12px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-size: 0.75rem;
        font-weight: 500;
        transition: all 0.15s;
      }
      .pip-btn-primary {
        background: hsl(142 76% 36%);
        color: white;
      }
      .pip-btn-primary:hover {
        background: hsl(142 76% 46%);
      }
      .pip-btn-ghost {
        background: rgba(255,255,255,0.1);
        color: white;
      }
      .pip-btn-ghost:hover {
        background: rgba(255,255,255,0.2);
      }
      .pip-btn-danger {
        background: rgba(239, 68, 68, 0.2);
        color: hsl(0 84% 60%);
      }
      .pip-btn-danger:hover {
        background: rgba(239, 68, 68, 0.3);
      }
      .pip-progress {
        height: 4px;
        background: rgba(255,255,255,0.1);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      .pip-progress-bar {
        height: 100%;
        background: hsl(142 76% 56%);
        transition: width 1s linear;
      }
    `;
    pipWindow.document.head.appendChild(style);
    
    setContainer(div);

    return () => {
      div.remove();
    };
  }, [pipWindow]);

  if (!container) return null;

  const progress = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0;
  const timerClass = timeRemaining <= 60 ? 'urgent' : timeRemaining <= 300 ? 'warning' : '';

  const content = (
    <>
      {/* Progress bar */}
      <div className="pip-progress">
        <div className="pip-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* Timer display */}
      <div className={`pip-timer ${timerClass}`}>
        {formatTime(timeRemaining)}
      </div>

      {/* Task text */}
      <div className="pip-task" title={taskText}>
        {taskText}
      </div>

      {/* Controls */}
      <div className="pip-controls">
        <button 
          className="pip-btn pip-btn-ghost" 
          onClick={() => onAddMinutes(5)}
          title="Add 5 minutes"
        >
          +5m
        </button>

        {isRunning ? (
          <button className="pip-btn pip-btn-ghost" onClick={onPause} title="Pause">
            ⏸
          </button>
        ) : isPaused ? (
          <button className="pip-btn pip-btn-ghost" onClick={onResume} title="Resume">
            ▶
          </button>
        ) : null}

        <button className="pip-btn pip-btn-danger" onClick={onStop} title="Stop">
          ✕
        </button>

        <button className="pip-btn pip-btn-primary" onClick={onComplete} title="Mark done">
          ✓ Done
        </button>
      </div>
    </>
  );

  return createPortal(content, container);
}
