-- Safety cleanup: these product IDs belong to Collab Studio, not the 90 Day
-- Planner. Remove them if the earlier Planner bridge migration was applied
-- before its mapping correction reached the Lovable-managed project.
DELETE FROM public.planner_commerce_mappings
WHERE provider = 'ghl'
  AND (
    (product_id = '6a70dd49734d26b901d3e786' AND price_id = '6a70e7bb471129d5db161366')
    OR
    (product_id = '6a70dd57bee6fddba29f2654' AND price_id = '6a70dd5716f0cca8c90d2db2')
  );
