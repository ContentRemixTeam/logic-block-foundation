import { useState, useEffect, useCallback, useRef } from 'react';

export interface TextSelectionData {
  text: string;
  x: number;
  y: number;
  containerRef: HTMLElement | null;
}

export function useTextSelection(containerRef: React.RefObject<HTMLElement>) {
  const [selection, setSelection] = useState<TextSelectionData | null>(null);
  const isSelectingRef = useRef(false);

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      // Only clear if we're not in the middle of a selection
      if (!isSelectingRef.current) {
        setSelection(null);
      }
      return;
    }

    const text = sel.toString().trim();
    if (!text || text.length < 3) {
      setSelection(null);
      return;
    }

    // Check if selection is within our container
    const container = containerRef.current;
    if (!container) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    
    // Check if selection is inside the container
    if (!container.contains(commonAncestor)) {
      setSelection(null);
      return;
    }

    // Get selection coordinates
    const rect = range.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Position toolbar above the selection, centered
    const x = rect.left + rect.width / 2 - containerRect.left;
    const y = rect.top - containerRect.top - 10;

    setSelection({
      text,
      x,
      y,
      containerRef: container,
    });
    
    isSelectingRef.current = false;
  }, [containerRef]);

  const handleMouseDown = useCallback(() => {
    isSelectingRef.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    // Small delay to let selection settle
    setTimeout(() => {
      handleSelectionChange();
    }, 10);
  }, [handleSelectionChange]);

  const handleTouchEnd = useCallback(() => {
    // Longer delay for mobile
    setTimeout(() => {
      handleSelectionChange();
    }, 100);
  }, [handleSelectionChange]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchend', handleTouchEnd);
    
    // Also listen for selection changes (for keyboard selection)
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [containerRef, handleMouseDown, handleMouseUp, handleTouchEnd, handleSelectionChange]);

  return { selection, clearSelection };
}
