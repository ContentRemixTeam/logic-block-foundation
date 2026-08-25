export interface SuccessPathEditContext {
  cycle_id: string;
  path_version: number;
  assignment_id: string;
  assignment_item_id: string;
  stage: string;
  milestone_key: string;
  milestone_title: string;
  move_key: string;
  action_id: string;
}

export interface TransitionPreview {
  status: 'pending';
  replayed: boolean;
  proposal_id: string;
  impact_diff: MemberTransitionImpactDiff;
  impact_diff_sha256: string;
}

export interface MemberTransitionImpactDiff {
  transition: { kind: 'focus_change' | 'milestone_advance'; reason_code: 'member_requested' | 'reviewed_business_evidence' | 'planner_reconciled' };
  stage: { old: string; new: string };
  milestone: { old: { key: string; title: string }; new: { key: string; title: string } };
  learning: { assignment_reroute: boolean; learning_item_changed: boolean };
  action: { old: { text: string; estimated_minutes: number }; new: { text: string; estimated_minutes: number } };
  history: { prior_task_preserved: boolean; prior_task_completion_preserved: boolean; evidence_preserved: boolean; actions_preserved: boolean; checkins_preserved: boolean };
}

export interface TransitionConfirmation {
  status: 'saved';
  replayed: boolean;
  transition_id: string;
  proposal_id: string;
  path_version: number;
  state_receipt_id: string;
  action_id: string;
  prior_action_id: string;
}

export type EngagementEvent = 'assignment_opened' | 'playback_started' | 'playback_completed' |
  'action_opened' | 'action_selected' | 'evidence_submitted' | 'checkin_completed' |
  'support_requested' | 'returned_after_absence';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[0-9a-f]{64}$/;
const exact=(value: Record<string,unknown>,keys:string[])=>Object.keys(value).sort().join('|')===[...keys].sort().join('|');
const record=(value:unknown):Record<string,unknown>|null=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const uuid=(value:unknown)=>typeof value==='string'&&UUID.test(value);
const bounded=(value:unknown,max:number)=>typeof value==='string'&&value.length>0&&value.length<=max;
const integer=(value:unknown,min:number,max:number)=>Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;
const object=(value:unknown,keys:string[],message:string)=>{const row=record(value);if(!row||!exact(row,keys))throw new Error(message);return row;};

export function parseEditContext(value:unknown):SuccessPathEditContext {
  const root=record(value); const context=record(root?.context);
  if(!root||!exact(root,['state','reason','context'])||root.state!=='ready'||root.reason!=='current_reviewed_authority'||!context||
    !exact(context,['cycle_id','path_version','assignment_id','assignment_item_id','stage','milestone_key','milestone_title','move_key','action_id'])||
    ![context.cycle_id,context.assignment_id,context.assignment_item_id,context.action_id].every(uuid)||
    !Number.isSafeInteger(context.path_version)||!['stage','milestone_key','milestone_title','move_key'].every(k=>typeof context[k]==='string'&&(context[k] as string).length>0&&(context[k] as string).length<=180))
    throw new Error('Current edit authority could not be verified.');
  return context as unknown as SuccessPathEditContext;
}

export function parseTransitionPreview(value:unknown):TransitionPreview {
  const message='Impact preview could not be verified.';
  const row=object(value,['status','replayed','proposal_id','impact_diff','impact_diff_sha256'],message);
  const diff=object(row.impact_diff,['transition','stage','milestone','learning','action','history'],message);
  const transition=object(diff.transition,['kind','reason_code'],message);
  const stage=object(diff.stage,['old','new'],message);
  const milestone=object(diff.milestone,['old','new'],message);
  const milestoneOld=object(milestone.old,['key','title'],message);const milestoneNew=object(milestone.new,['key','title'],message);
  const learning=object(diff.learning,['assignment_reroute','learning_item_changed'],message);
  const action=object(diff.action,['old','new'],message);const actionOld=object(action.old,['text','estimated_minutes'],message);const actionNew=object(action.new,['text','estimated_minutes'],message);
  const history=object(diff.history,['prior_task_preserved','prior_task_completion_preserved','evidence_preserved','actions_preserved','checkins_preserved'],message);
  if(row.status!=='pending'||typeof row.replayed!=='boolean'||!uuid(row.proposal_id)||typeof row.impact_diff_sha256!=='string'||!SHA.test(row.impact_diff_sha256)||
    !['focus_change','milestone_advance'].includes(String(transition.kind))||!['member_requested','reviewed_business_evidence','planner_reconciled'].includes(String(transition.reason_code))||
    !bounded(stage.old,120)||!bounded(stage.new,120)||![milestoneOld.key,milestoneOld.title,milestoneNew.key,milestoneNew.title].every(v=>bounded(v,180))||
    typeof learning.assignment_reroute!=='boolean'||typeof learning.learning_item_changed!=='boolean'||
    !bounded(actionOld.text,300)||!bounded(actionNew.text,300)||!integer(actionOld.estimated_minutes,5,240)||!integer(actionNew.estimated_minutes,5,240)||
    Object.values(history).some(v=>typeof v!=='boolean')) throw new Error(message);
  return {status:'pending',replayed:row.replayed,proposal_id:String(row.proposal_id),impact_diff:{
    transition:{kind:transition.kind as MemberTransitionImpactDiff['transition']['kind'],reason_code:transition.reason_code as MemberTransitionImpactDiff['transition']['reason_code']},
    stage:{old:String(stage.old),new:String(stage.new)},milestone:{old:{key:String(milestoneOld.key),title:String(milestoneOld.title)},new:{key:String(milestoneNew.key),title:String(milestoneNew.title)}},
    learning:{assignment_reroute:learning.assignment_reroute,learning_item_changed:learning.learning_item_changed},
    action:{old:{text:String(actionOld.text),estimated_minutes:Number(actionOld.estimated_minutes)},new:{text:String(actionNew.text),estimated_minutes:Number(actionNew.estimated_minutes)}},
    history:{prior_task_preserved:history.prior_task_preserved as boolean,prior_task_completion_preserved:history.prior_task_completion_preserved as boolean,evidence_preserved:history.evidence_preserved as boolean,actions_preserved:history.actions_preserved as boolean,checkins_preserved:history.checkins_preserved as boolean}
  },impact_diff_sha256:row.impact_diff_sha256};
}

export function parseTransitionConfirmation(value:unknown):TransitionConfirmation {
  const row=record(value); const keys=['status','replayed','transition_id','proposal_id','path_version','state_receipt_id','action_id','prior_action_id'];
  if(!row||!exact(row,keys)||row.status!=='saved'||typeof row.replayed!=='boolean'||![row.transition_id,row.proposal_id,row.state_receipt_id,row.action_id,row.prior_action_id].every(uuid)||!Number.isSafeInteger(row.path_version))
    throw new Error('Confirmed change could not be verified.');
  return row as unknown as TransitionConfirmation;
}

export function parseEngagementReceipt(value:unknown) {
  const row=record(value);
  if(!row||!exact(row,['status','reason','event_id','replayed','reported_progress_basis_points','progress_basis_points'])||row.status!=='accepted'||!['recorded','heartbeat_deduplicated'].includes(String(row.reason))||typeof row.replayed!=='boolean'||!(row.event_id===null||uuid(row.event_id))||!(row.reported_progress_basis_points===null||integer(row.reported_progress_basis_points,0,10000))||!(row.progress_basis_points===null||integer(row.progress_basis_points,0,10000)))
    throw new Error('Engagement receipt could not be verified.');
  return row;
}
