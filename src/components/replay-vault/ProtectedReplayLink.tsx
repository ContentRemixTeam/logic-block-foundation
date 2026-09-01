import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { makeSurfaceDetailHref } from './replayVaultCore.mjs';
import type { ProtectedDetailTarget } from './types';

interface ProtectedReplayLinkProps extends ProtectedDetailTarget {
  children: ReactNode;
  className?: string;
  detailBasePath?: string;
  onClick?: () => void;
}

export function ProtectedReplayLink({ resourceId, questionId, momentId, children, className, detailBasePath, onClick }: ProtectedReplayLinkProps) {
  return (
    <Link
      to={makeSurfaceDetailHref({ resourceId, questionId, momentId }, detailBasePath)}
      className={className}
      onClick={onClick}
      data-vault-detail-link="protected"
    >
      {children}
    </Link>
  );
}
