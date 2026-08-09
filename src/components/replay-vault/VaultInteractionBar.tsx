import { RefObject, useMemo } from 'react';
import { Bookmark, Check, Copy, ExternalLink, FilePlus2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_SHARE_URL } from '@/constants/community';
import type { PlaybackResult, PlaybackTarget } from './types';
import { makeDetailHref } from './replayVaultCore.mjs';
import { useVaultInteractions } from './useVaultInteractions';
interface Props{playback:PlaybackResult;target:PlaybackTarget;videoRef:RefObject<HTMLVideoElement>;sourceGeneration:number;}
export function VaultInteractionBar({playback,target,videoRef,sourceGeneration}:Props){const x=useVaultInteractions(playback,target,videoRef,sourceGeneration);const deepLink=useMemo(()=>makeDetailHref(target),[target]);const progress=x.watch.durationSeconds?Math.min(100,Math.round(x.watch.watchedSeconds/x.watch.durationSeconds*100)):0;const youtube=playback.provider==='youtube';
 const copy=async()=>{const node=document.querySelector('[data-vault-copy-result]');try{await navigator.clipboard.writeText(`${window.location.origin}${deepLink}`);if(node)node.textContent='Protected answer link copied.';}catch{if(node)node.textContent='Copy unavailable. Select the address from your browser.';}};
 const openCommunity=()=>{const opened=window.open(DEFAULT_SHARE_URL,'_blank','noopener,noreferrer');const node=document.querySelector('[data-vault-copy-result]');if(node)node.textContent=opened?'Community opened. Nothing was posted automatically.':'Community was not opened. Allow popups or use the link again.';};
 if(!x.available)return <div className="rounded-lg border p-3 text-sm text-muted-foreground">Saved actions are unavailable for this noncanonical answer.</div>;
 return <div className="space-y-3 rounded-lg border p-3" data-vault-interactions aria-busy={x.bookmarkBusy||x.noteBusy||x.syncState==='pending'}>
  <div className="flex min-w-0 flex-wrap gap-2">
   <Button type="button" variant="outline" className="min-h-11" disabled={x.loadState!=='ready'||x.bookmarkBusy} aria-pressed={Boolean(x.bookmark)} onClick={()=>void x.toggleBookmark()}>{x.bookmarkBusy?<RotateCw className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true"/>:x.bookmark?<Check className="mr-2 h-4 w-4" aria-hidden="true"/>:<Bookmark className="mr-2 h-4 w-4" aria-hidden="true"/>}{x.bookmarkBusy?'Saving…':x.bookmark?'Saved':'Save answer'}</Button>
   <Button type="button" variant="outline" className="min-h-11" disabled={x.loadState!=='ready'||x.noteBusy} onClick={()=>void x.createNote()}><FilePlus2 className="mr-2 h-4 w-4" aria-hidden="true"/>{x.noteBusy?'Creating note…':'Add note'}</Button>
   <Button type="button" variant="outline" className="min-h-11" onClick={()=>void copy()}><Copy className="mr-2 h-4 w-4" aria-hidden="true"/>Copy protected link</Button>
   <Button type="button" variant="outline" className="min-h-11" onClick={openCommunity}><ExternalLink className="mr-2 h-4 w-4" aria-hidden="true"/>Open community</Button>
  </div>
  {x.loadState==='failed'&&<Button type="button" variant="link" className="min-h-11 px-0" onClick={()=>void x.retryLoad()}>Retry saved actions</Button>}
  {youtube?<p className="text-sm text-muted-foreground">Watch progress is unavailable for YouTube in this version. No playback session is created.</p>:<><div role="progressbar" aria-label="Replay watch progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-primary" style={{width:`${progress}%`}}/></div><p className="text-sm text-muted-foreground">{x.watch.completed?'Watched':progress?`${progress}% watched`:x.sessionState==='loading'?'Progress starts after you press play.':'Watch progress is unavailable.'}{x.syncState==='pending'?' Syncing…':x.syncState==='failed'?' Not synced.':''}</p>{x.watch.lastPositionSeconds>1&&<Button type="button" variant="link" className="min-h-11 px-0" onClick={x.resume}>Resume at {Math.floor(x.watch.lastPositionSeconds/60)}:{String(Math.floor(x.watch.lastPositionSeconds%60)).padStart(2,'0')}</Button>}</>}
  {x.note&&<a className="inline-flex min-h-11 items-center text-sm font-medium underline" href={x.note.openPath}>Open confirmed note</a>}
  <p data-vault-copy-result className="text-sm text-muted-foreground"/>
  <p data-vault-interaction-status tabIndex={-1} className="text-sm" role="status" aria-live="polite">{x.loadState==='loading'?'Loading saved actions…':x.status}</p>
 </div>;
}
