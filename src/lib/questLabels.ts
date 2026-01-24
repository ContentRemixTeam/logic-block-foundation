// Quest Mode navigation labels and microcopy
export const questLabels = {
  // Planning Section
  dashboard: "Quest Map",
  cycleSetup: "New Quest",
  dailyPlan: "Today's Mission",
  weeklyPlan: "Week's Campaign",
  tasks: "Quest Log",
  
  // Reflection Section
  dailyReview: "Mission Debrief",
  weeklyReview: "Checkpoint",
  monthlyReview: "30-Day Check",
  progress: "Quest Progress",
  
  // Resources Section
  notes: "Field Notes",
  sops: "Playbooks",
  habits: "Rituals",
  ideas: "Discoveries",
  mindset: "Mindset",
  community: "Victory Hall",
  
  // Settings (unchanged)
  settings: "Settings",
  support: "Support",
};

export const defaultLabels = {
  // Planning Section
  dashboard: "Dashboard",
  cycleSetup: "Cycle Setup",
  dailyPlan: "Daily Plan",
  weeklyPlan: "Weekly Plan",
  tasks: "Tasks",
  
  // Reflection Section
  dailyReview: "Daily Review",
  weeklyReview: "Weekly Review",
  monthlyReview: "30-Day Review",
  progress: "Progress",
  
  // Resources Section
  notes: "Notes",
  sops: "SOPs",
  habits: "Habits",
  ideas: "Ideas",
  mindset: "Mindset",
  community: "Celebration Wall",
  
  // Settings
  settings: "Settings",
  support: "Support",
};

// Quest mode microcopy
export const questMicrocopy = {
  // Daily Debrief
  debriefQuestion: "How did today's mission go?",
  debriefSuccess: "Quest log updated. Tomorrow awaits.",
  debriefComplete: "Another day on the journey. Well done.",
  
  // Weekly Checkpoint
  checkpointReached: "Checkpoint reached. Assess your progress.",
  weekComplete: (week: number) => `Week ${week} complete. Onward to Week ${week + 1}.`,
  summitCloser: "The summit draws closer.",
  
  // Quest Complete
  questComplete: "Quest complete, adventurer!",
  victoryAchieved: "Victory achieved. What's your next quest?",
  
  // Comeback
  welcomeBack: "Welcome back to the quest.",
  pauseMessage: "Every great adventure has pauses. Resume yours.",
  pathRemains: "The path remains. Continue when ready.",
};

// Level titles based on user level
export const getLevelTitle = (level: number): string => {
  if (level <= 5) return "Novice Adventurer";
  if (level <= 10) return "Skilled Quester";
  if (level <= 15) return "Veteran Explorer";
  if (level <= 20) return "Master Strategist";
  return "Legendary Boss";
};

// XP requirements per level (increases each level)
export const getXPForLevel = (level: number): number => {
  return level * 500;
};

// Calculate level from total XP
export const calculateLevel = (totalXP: number): { level: number; currentXP: number; xpToNextLevel: number } => {
  let level = 1;
  let remainingXP = totalXP;
  
  while (remainingXP >= getXPForLevel(level) && level < 100) {
    remainingXP -= getXPForLevel(level);
    level++;
  }
  
  return {
    level,
    currentXP: remainingXP,
    xpToNextLevel: getXPForLevel(level),
  };
};

// XP rewards for different actions
export const XP_REWARDS = {
  dailyDebrief: 5,
  weeklyCheckpoint: 25,
  monthlySummit: 100,
  top3Complete: 10,
  challengeComplete: 50,
};

// Challenge quest types
export const CHALLENGE_TYPES = {
  consistencyCampaign: {
    name: "The Consistency Campaign",
    description: "Complete daily debrief 7 days in a row",
    target: 7,
    reward: 50,
    trophy: "Consistency Trophy",
  },
  revenueRaid: {
    name: "Revenue Raid",
    description: "Complete 1 sales task daily for 5 days",
    target: 5,
    reward: 50,
    trophy: "Revenue Champion",
  },
  deepWorkExpedition: {
    name: "Deep Work Expedition",
    description: "2 focus blocks daily for 5 days",
    target: 5,
    reward: 50,
    trophy: "Focus Master",
  },
  reflectionRitual: {
    name: "Reflection Ritual",
    description: "Complete all reviews on time for 7 days",
    target: 7,
    reward: 50,
    trophy: "Reflection Sage",
  },
};
