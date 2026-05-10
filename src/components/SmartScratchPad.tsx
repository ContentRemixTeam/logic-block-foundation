import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CharacterCounter } from '@/components/ui/character-counter';
import { cn } from '@/lib/utils';
import { CAPTURE_TAGS, TAG_BY_NAME } from '@/lib/captureTags';

interface SmartScratchPadProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}

const QUICK_TAGS = CAPTURE_TAGS.filter(t => t.kind === 'destination').slice(0, 6);

export function SmartScratchPad({
  value,
  onChange,
  onBlur,
  maxLength = 5000,
  placeholder = 'Dump anything here. Tasks, ideas, reminders, questions, wins, content sparks…',
  className,
}: SmartScratchPadProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hashPosition, setHashPosition] = useState<number | null>(null);
  const [filterText, setFilterText] = useState('');

  // Counts of detected destination tags
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CAPTURE_TAGS.forEach(({ tag }) => {
      const matches = value.match(new RegExp(`#${tag}\\b`, 'gi'));
      if (matches?.length) counts[tag] = matches.length;
    });
    return counts;
  }, [value]);

  const totalTagged = useMemo(
    () => Object.values(tagCounts).reduce((a, b) => a + b, 0),
    [tagCounts]
  );

  const filteredTags = useMemo(() => {
    if (!filterText) return CAPTURE_TAGS;
    const q = filterText.toLowerCase();
    return CAPTURE_TAGS.filter(t => t.tag.startsWith(q));
  }, [filterText]);

  const insertTag = useCallback((tagName: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    if (hashPosition !== null) {
      const before = value.substring(0, hashPosition);
      const after = value.substring(start);
      const newValue = `${before}#${tagName} ${after}`;
      onChange(newValue);
      const newPos = hashPosition + tagName.length + 2;
      setTimeout(() => {
        ta.setSelectionRange(newPos, newPos);
        ta.focus();
      }, 0);
    } else {
      const before = value.substring(0, start);
      const after = value.substring(end);
      const newValue = `${before}#${tagName} ${after}`;
      onChange(newValue);
      const newPos = start + tagName.length + 2;
      setTimeout(() => {
        ta.setSelectionRange(newPos, newPos);
        ta.focus();
      }, 0);
    }
    setShowAutocomplete(false);
    setHashPosition(null);
    setFilterText('');
  }, [value, onChange, hashPosition]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart;
    const before = newValue.substring(0, cursorPos);
    const lastHash = before.lastIndexOf('#');

    if (lastHash !== -1) {
      const afterHash = before.substring(lastHash + 1);
      // valid tag chars only and reasonable length
      if (/^[a-z0-9-]{0,20}$/i.test(afterHash)) {
        setHashPosition(lastHash);
        setFilterText(afterHash);
        setShowAutocomplete(true);
        setSelectedIndex(0);
        return;
      }
    }
    setShowAutocomplete(false);
    setHashPosition(null);
    setFilterText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showAutocomplete) return; // Enter, Tab behave normally otherwise
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(p => (p + 1) % Math.max(filteredTags.length, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(p => (p - 1 + filteredTags.length) % Math.max(filteredTags.length, 1));
        break;
      case 'Enter':
      case 'Tab':
        if (filteredTags.length > 0) {
          e.preventDefault();
          insertTag(filteredTags[selectedIndex].tag);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowAutocomplete(false);
        setHashPosition(null);
        setFilterText('');
        break;
    }
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      const inTa = textareaRef.current?.contains(t);
      const inDd = dropdownRef.current?.contains(t);
      if (!inTa && !inDd) setShowAutocomplete(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Quick tag insert buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_TAGS.map(({ tag, label, emoji }) => (
            <Button
              key={tag}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertTag(tag)}
              className="h-7 px-2 text-xs gap-1"
            >
              <span>{emoji}</span>
              <span>#{tag}</span>
              {tagCounts[tag] > 0 && (
                <span className="ml-0.5 text-[10px] font-bold opacity-70">
                  ({tagCounts[tag]})
                </span>
              )}
            </Button>
          ))}
        </div>
        {totalTagged > 0 && (
          <Badge variant="secondary" className="text-xs">
            {totalTagged} tagged
          </Badge>
        )}
      </div>

      {/* Helper copy */}
      <p className="text-xs text-muted-foreground">
        Use tags like #task, #idea, #content, #project, #question, #win — or leave it messy and sort it later.
      </p>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          className={cn(
            'w-full min-h-[200px] max-h-[500px] p-3 text-sm resize-none rounded-md border border-input bg-background leading-6 overflow-y-auto',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'placeholder:text-muted-foreground'
          )}
        />

        {showAutocomplete && filteredTags.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-[100] left-3 bottom-3 w-64 max-h-72 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg"
          >
            <div className="px-2 py-1.5 text-xs text-muted-foreground border-b bg-muted/50 sticky top-0">
              Choose a tag
            </div>
            {filteredTags.map((t, idx) => (
              <button
                key={t.tag}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertTag(t.tag);
                }}
                className={cn(
                  'w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors',
                  idx === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                )}
              >
                <span className="w-6 text-center">{t.emoji}</span>
                <div className="flex-1">
                  <div className="font-medium">#{t.tag}</div>
                  <div className="text-xs text-muted-foreground">{t.description}</div>
                </div>
              </button>
            ))}
            <div className="px-2 py-1.5 text-[10px] text-muted-foreground border-t bg-muted/50 sticky bottom-0">
              ↑↓ navigate · Enter/Tab select · Esc close
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <CharacterCounter current={value.length} max={maxLength} />
      </div>
    </div>
  );
}
