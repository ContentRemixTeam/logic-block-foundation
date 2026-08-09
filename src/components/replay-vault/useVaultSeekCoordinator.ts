import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { applySeekTarget, formatSpokenTime } from './replayVaultCore.mjs';
interface SeekCoordinatorOptions { mediaRef: RefObject<HTMLVideoElement>; targetSeconds: number | null; targetKey: string | null; activationNonce: number; }
export function useVaultSeekCoordinator({ mediaRef, targetSeconds, targetKey, activationNonce }: SeekCoordinatorOptions) {
  const [metadataReady, setMetadataReady] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const appliedActivation = useRef<string | null>(null);
  const applyPendingTarget = useCallback(() => {
    const media = mediaRef.current;
    const activationKey = targetKey ? `${targetKey}:${activationNonce}` : null;
    if (!media || !metadataReady || targetSeconds === null || !activationKey || appliedActivation.current === activationKey) return;
    try {
      const applied = applySeekTarget(media, targetSeconds);
      appliedActivation.current = activationKey;
      setAnnouncement(`Jumped to ${formatSpokenTime(applied)}.`);
    } catch { setAnnouncement("Couldn't jump to that moment. Play from the nearest available point."); }
  }, [activationNonce, mediaRef, metadataReady, targetKey, targetSeconds]);
  useEffect(() => { applyPendingTarget(); }, [applyPendingTarget]);
  const onLoadedMetadata = useCallback(() => { setMetadataReady(true); }, []);
  const resetForSource = useCallback(() => { setMetadataReady(false); appliedActivation.current = null; }, []);
  return { announcement, onLoadedMetadata, resetForSource };
}
