import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { makeDetailHref } from './replayVaultCore.mjs';
import type { ProtectedDetailTarget } from './types';

interface ProtectedReplayLinkProps extends ProtectedDetailTarget {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ProtectedReplayLink({ resourceId, questionId, momentId, children, className, onClick }: ProtectedReplayLinkProps) {
  return (
    <Link
      to={makeDetailHref({ resourceId, questionId, momentId })}
      className={className}
      onClick={onClick}
      data-vault-detail-link="protected"
    >
      {children}
    </Link>
  );
}
