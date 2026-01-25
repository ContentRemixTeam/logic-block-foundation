-- Change default for show_income_tracker to true (features on by default)
ALTER TABLE user_settings 
ALTER COLUMN show_income_tracker SET DEFAULT true;