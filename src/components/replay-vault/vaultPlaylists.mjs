export const VAULT_PLAYLISTS = [
  { slug: 'start-here', title: 'Start Here: Best of the Vault', description: 'Choose a clear 90-day result, make the next move, and review what the evidence says.', query: '90 day goal plan next step evaluate' },
  { slug: 'focus-next', title: 'What Should I Focus on Next?', description: 'Turn too many ideas into one useful priority for this week.', query: 'focus priority too many ideas next step plan' },
  { slug: 'offer-pricing', title: 'What Should I Sell and Charge?', description: 'Shape, price, and validate an offer people actually want.', query: 'offer pricing package validate what should I sell' },
  { slug: 'find-buyers', title: 'How Do I Find the Right Buyers?', description: 'Choose a discovery path and connect with the people your offer is for.', query: 'find audience buyers leads outreach visibility' },
  { slug: 'content-email', title: 'What Should I Say in My Content and Emails?', description: 'Create content and emails that close belief gaps and prepare people to buy.', query: 'content email nurture welcome sequence belief gap' },
  { slug: 'make-sales', title: 'How Do I Make More Sales?', description: 'Use invitations, follow-up, and clear decisions when sales feel slow.', query: 'sales follow up objections launch conversion cash' },
  { slug: 'capacity', title: 'How Do I Keep Going When Life Gets Loud?', description: 'Make meaningful progress through low-capacity weeks, setbacks, and restarts.', query: 'overwhelmed capacity ADHD setback restart mindset' },
  { slug: 'customer-results', title: 'How Do I Help Customers Get Results?', description: 'Improve delivery, engagement, proof, retention, and the first customer win.', query: 'customer results delivery engagement retention testimonials' },
  { slug: 'systems', title: 'What Should I Systemize, Delegate, or Automate?', description: 'Simplify the work before choosing tools, a team member, or automation.', query: 'systems SOP delegate VA tools automation AI' },
  { slug: 'guest-workshops', title: 'Guest Expert Workshops', description: 'Find approved guest teaching by the business problem it can help you solve.', query: 'guest workshop expert training' },
];

export function findVaultPlaylist(slug) {
  return VAULT_PLAYLISTS.find((playlist) => playlist.slug === slug) ?? null;
}
