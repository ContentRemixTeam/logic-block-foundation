import type { ReactNode } from 'react';
export function Layout({ children }: { children: ReactNode }) {
  return <div data-testid="layout-owner"><main>{children}</main></div>;
}
