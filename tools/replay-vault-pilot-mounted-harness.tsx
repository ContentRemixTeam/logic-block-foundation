import React from 'react';
import { createRoot } from 'react-dom/client';
import MastermindVideoSearch from '@/components/mastermind/MastermindVideoSearch';

const host = document.createElement('main');
host.id = 'pilot-root';
host.className = 'mx-auto w-full min-w-0 max-w-6xl overflow-x-clip px-1';
document.body.append(host);
createRoot(host).render(<MastermindVideoSearch />);
