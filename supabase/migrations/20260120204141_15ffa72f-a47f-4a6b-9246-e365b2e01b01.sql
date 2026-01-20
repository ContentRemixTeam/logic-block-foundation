-- Enable beta testing for monthly_challenges feature
UPDATE feature_flags 
SET enabled = true, rollout_percent = 0, updated_at = now()
WHERE key = 'monthly_challenges';

-- Add lenameu@gmail.com as beta tester (user_id from entitlements lookup)
INSERT INTO user_feature_flags (user_id, key, enabled)
VALUES (
  '72011c8d-a746-47e8-8f45-79789388260b',
  'monthly_challenges',
  true
)
ON CONFLICT (user_id, key) DO UPDATE SET enabled = true;

-- Sample Theme 1: Valentine's Theme (February reward)
INSERT INTO app_themes (slug, name, preview_emoji, is_published, config_json) VALUES
('valentines', 'Valentine''s Glow', '💕', true, '{
  "tokens": {
    "--primary": "350 89% 60%",
    "--primary-foreground": "0 0% 100%",
    "--accent": "330 81% 60%",
    "--accent-foreground": "0 0% 100%"
  },
  "art": {},
  "fx": {
    "confetti": {
      "enabled": true,
      "style": "petals",
      "intensity": "medium"
    },
    "sound": {
      "enabled": false,
      "unlockSoundKey": "sparkle",
      "completeSoundKey": "level_up"
    }
  }
}')
ON CONFLICT (slug) DO NOTHING;

-- Sample Theme 2: Spring Theme (March reward)
INSERT INTO app_themes (slug, name, preview_emoji, is_published, config_json) VALUES
('spring', 'Spring Bloom', '🌸', true, '{
  "tokens": {
    "--primary": "142 76% 36%",
    "--primary-foreground": "0 0% 100%",
    "--accent": "330 70% 70%",
    "--accent-foreground": "0 0% 100%"
  },
  "art": {},
  "fx": {
    "confetti": {
      "enabled": true,
      "style": "petals",
      "intensity": "low"
    },
    "sound": {
      "enabled": false
    }
  }
}')
ON CONFLICT (slug) DO NOTHING;

-- Create January 2026 challenge template (Valentine's theme reward)
INSERT INTO monthly_challenge_templates (
  month_start, 
  month_end, 
  title, 
  description, 
  reward_theme_id,
  is_published
) 
SELECT 
  '2026-01-01',
  '2026-01-31',
  'January Momentum Challenge',
  'Start the year strong! Complete tasks and unlock a special theme.',
  id,
  true
FROM app_themes WHERE slug = 'valentines' LIMIT 1
ON CONFLICT DO NOTHING;

-- Create February 2026 template (Spring theme reward)
INSERT INTO monthly_challenge_templates (
  month_start, 
  month_end, 
  title, 
  description, 
  reward_theme_id,
  is_published
) 
SELECT 
  '2026-02-01',
  '2026-02-28',
  'February Focus Challenge',
  'Stay consistent this month and bloom with a new theme!',
  id,
  true
FROM app_themes WHERE slug = 'spring' LIMIT 1
ON CONFLICT DO NOTHING;