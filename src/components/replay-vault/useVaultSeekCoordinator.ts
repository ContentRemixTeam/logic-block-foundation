import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { applySeekTarget, formatSpokenTime } from './replayVaultCore.mjs';

interface SeekCoordinatorOptions {
  mediaRef: RefObject<HTMLVideoElement>;
  targetSeconds: number | null;
  targetKey: string | null;
}

export function useVaultSeekCoordinator({ mediaRef, targetSeconds, targetKey }: SeekCoordinatorOptions) {
  const [metadataReady, setMetadataReady] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const appliedKey = useRef<string | null>(null);

  const applyPendingTarget = useCallback(() => {
    const media = mediaRef.current;
    if (!media || !metadataReady || targetSeconds === null || !targetKey || appliedKey.current === targetKey) return;
    try {
      const applied = applySeekTarget(media, targetSeconds);
      appliedKey.current = targetKey;
      setAnnouncement(`Jumped to ${formatSpokenTime(applied)}.`);
    } catch {
      setAnnouncement("Couldn't jump to that moment. Play from the nearest available point.");
    }
  }, [mediaRef, metadataReady, targetKey, targetSeconds]);

  useEffect(() => {
    appliedKey.current = null;
    applyPendingTarget();
  }, [applyPendingTarget, targetKey, targetSeconds]);

  const onLoadedMetadata = useCallback(() => {
    setMetadataReady(true);
  }, []);

  useEffect(() => {
    applyPendingTarget();
  }, [applyPendingTarget, metadataReady]);

  const resetForSource = useCallback(() => {
    setMetadataReady(false);
    appliedKey.current = null;
  }, []);

  return { announcement, onLoadedMetadata, resetForSource };
}
