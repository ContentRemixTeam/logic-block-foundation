import { ContentPlannerData } from '@/types/contentPlanner';

// Validation for each step of the content planner wizard
export function validateContentPlannerStep(step: number, data: ContentPlannerData): boolean {
  switch (step) {
    case 1: // Mode Selection
      return validateModeSelection(data);
    case 2: // Messaging Framework
      return validateMessagingFramework(data);
    case 3: // Format Selection
      return validateFormatSelection(data);
    case 4: // Vault Review
      return true; // Optional step
    case 5: // Batching
      return validateBatching(data);
    case 6: // Calendar
      return validateCalendar(data);
    case 7: // Review
      return true; // Review step is always valid
    default:
      return false;
  }
}

function validateModeSelection(data: ContentPlannerData): boolean {
  // Must select a mode
  if (!data.mode) return false;
  
  // If launch mode, must select a launch
  if (data.mode === 'launch' && !data.launchId) return false;
  
  // Must select a planning period
  if (!data.planningPeriod) return false;
  
  // If custom period, must have valid dates
  if (data.planningPeriod === 'custom') {
    if (!data.customStartDate || !data.customEndDate) return false;
    if (new Date(data.customEndDate) < new Date(data.customStartDate)) return false;
  }
  
  return true;
}

function validateMessagingFramework(data: ContentPlannerData): boolean {
  // At minimum, need core problem and unique solution
  if (!data.coreProblem?.trim()) return false;
  if (!data.uniqueSolution?.trim()) return false;
  
  // Need at least one selling point
  if (data.sellingPoints.length === 0) return false;
  
  // Need at least one messaging angle
  if (data.messagingAngles.length === 0) return false;
  
  return true;
}

function validateFormatSelection(data: ContentPlannerData): boolean {
  // Must select at least one format
  return data.selectedFormats.length > 0;
}

function validateBatching(data: ContentPlannerData): boolean {
  // If batching is enabled, need core content info
  if (data.batchingEnabled) {
    if (!data.coreContentTitle?.trim()) return false;
    if (!data.coreContentType) return false;
    if (data.batchTargetFormats.length === 0) return false;
  }
  
  return true;
}

function validateCalendar(data: ContentPlannerData): boolean {
  // Need at least one planned item
  return data.plannedItems.length > 0;
}

// Get validation error message for a step
export function getValidationError(step: number, data: ContentPlannerData): string | null {
  switch (step) {
    case 1:
      if (!data.mode) return 'Please select a planning mode';
      if (data.mode === 'launch' && !data.launchId) return 'Please select a launch';
      if (!data.planningPeriod) return 'Please select a time period';
      if (data.planningPeriod === 'custom') {
        if (!data.customStartDate || !data.customEndDate) return 'Please select start and end dates';
        if (new Date(data.customEndDate) < new Date(data.customStartDate)) return 'End date must be after start date';
      }
      return null;
      
    case 2:
      if (!data.coreProblem?.trim()) return 'Please describe the core problem you solve';
      if (!data.uniqueSolution?.trim()) return 'Please describe your unique solution';
      if (data.sellingPoints.length === 0) return 'Please add at least one selling point';
      if (data.messagingAngles.length === 0) return 'Please select at least one messaging angle';
      return null;
      
    case 3:
      if (data.selectedFormats.length === 0) return 'Please select at least one content format';
      return null;
      
    case 5:
      if (data.batchingEnabled) {
        if (!data.coreContentTitle?.trim()) return 'Please enter a title for your core content';
        if (!data.coreContentType) return 'Please select a content type';
        if (data.batchTargetFormats.length === 0) return 'Please select at least one format to batch into';
      }
      return null;
      
    case 6:
      if (data.plannedItems.length === 0) return 'Please add at least one content item to your calendar';
      return null;
      
    default:
      return null;
  }
}
