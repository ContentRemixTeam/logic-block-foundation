import { ColumnDefinition, FieldDefinition, UseCaseType, BoardSettings } from '@/types/projectDesigner';

export interface UseCaseTemplate {
  columns: ColumnDefinition[];
  suggestedFields: FieldDefinition[];
  defaultBoardName: string;
  defaultSettings: Partial<BoardSettings>;
}

// Generate unique IDs for template items
let idCounter = 100;
const genId = () => String(idCounter++);

export const USE_CASE_TEMPLATES: Record<UseCaseType, UseCaseTemplate> = {
  leads: {
    columns: [
      { id: genId(), name: 'Lead', color: '#94A3B8' },
      { id: genId(), name: 'Discovery Call', color: '#3B82F6' },
      { id: genId(), name: 'Proposal Sent', color: '#F59E0B' },
      { id: genId(), name: 'Client', color: '#10B981' },
      { id: genId(), name: 'Follow-up', color: '#8B5CF6' },
    ],
    suggestedFields: [
      { id: genId(), key: 'contact_email', name: 'Email', type: 'email', required: false, showOnCard: true },
      { id: genId(), key: 'contact_phone', name: 'Phone', type: 'phone', required: false, showOnCard: false },
      { id: genId(), key: 'company', name: 'Company', type: 'text', required: false, showOnCard: true },
      { id: genId(), key: 'deal_value', name: 'Deal Value', type: 'currency', required: false, showOnCard: true },
      { id: genId(), key: 'next_action', name: 'Next Action Date', type: 'date', required: false, showOnCard: true },
      { id: genId(), key: 'notes', name: 'Notes', type: 'text', required: false, showOnCard: false },
    ],
    defaultBoardName: 'Client Pipeline',
    defaultSettings: { showRevenue: true },
  },
  content: {
    columns: [
      { id: genId(), name: 'Ideas', color: '#8B5CF6' },
      { id: genId(), name: 'Drafting', color: '#F59E0B' },
      { id: genId(), name: 'Editing', color: '#3B82F6' },
      { id: genId(), name: 'Scheduled', color: '#06B6D4' },
      { id: genId(), name: 'Published', color: '#10B981' },
    ],
    suggestedFields: [
      { id: genId(), key: 'content_type', name: 'Type', type: 'select', required: false, showOnCard: true, options: ['Blog', 'Video', 'Podcast', 'Social', 'Email'] },
      { id: genId(), key: 'platform', name: 'Platform', type: 'select', required: false, showOnCard: true, options: ['Website', 'YouTube', 'Instagram', 'LinkedIn', 'Twitter', 'TikTok'] },
      { id: genId(), key: 'publish_date', name: 'Publish Date', type: 'date', required: false, showOnCard: true },
      { id: genId(), key: 'hook', name: 'Hook/Title', type: 'text', required: false, showOnCard: false },
    ],
    defaultBoardName: 'Content Calendar',
    defaultSettings: { showDueDate: true },
  },
  products: {
    columns: [
      { id: genId(), name: 'Ideas', color: '#8B5CF6' },
      { id: genId(), name: 'Planning', color: '#3B82F6' },
      { id: genId(), name: 'Creating', color: '#F59E0B' },
      { id: genId(), name: 'Launch', color: '#EF4444' },
      { id: genId(), name: 'Post-Launch', color: '#10B981' },
    ],
    suggestedFields: [
      { id: genId(), key: 'price', name: 'Price', type: 'currency', required: false, showOnCard: true },
      { id: genId(), key: 'launch_date', name: 'Launch Date', type: 'date', required: false, showOnCard: true },
      { id: genId(), key: 'product_type', name: 'Type', type: 'select', required: false, showOnCard: true, options: ['Course', 'Ebook', 'Template', 'Service', 'Membership'] },
      { id: genId(), key: 'revenue_goal', name: 'Revenue Goal', type: 'currency', required: false, showOnCard: false },
    ],
    defaultBoardName: 'Product Launches',
    defaultSettings: { showRevenue: true },
  },
  events: {
    columns: [
      { id: genId(), name: 'Planning', color: '#8B5CF6' },
      { id: genId(), name: 'Vendors', color: '#3B82F6' },
      { id: genId(), name: 'Promotion', color: '#F59E0B' },
      { id: genId(), name: 'Event Day', color: '#EF4444' },
      { id: genId(), name: 'Wrap-up', color: '#10B981' },
    ],
    suggestedFields: [
      { id: genId(), key: 'event_date', name: 'Event Date', type: 'date', required: false, showOnCard: true },
      { id: genId(), key: 'event_type', name: 'Type', type: 'select', required: false, showOnCard: true, options: ['Webinar', 'Summit', 'Workshop', 'Conference', 'Retreat'] },
      { id: genId(), key: 'budget', name: 'Budget', type: 'currency', required: false, showOnCard: false },
      { id: genId(), key: 'attendees_goal', name: 'Attendee Goal', type: 'number', required: false, showOnCard: true },
      { id: genId(), key: 'venue_url', name: 'Venue/Link', type: 'url', required: false, showOnCard: false },
    ],
    defaultBoardName: 'Events',
    defaultSettings: { showDueDate: true },
  },
  projects: {
    columns: [
      { id: genId(), name: 'Briefing', color: '#8B5CF6' },
      { id: genId(), name: 'In Progress', color: '#F59E0B' },
      { id: genId(), name: 'Review', color: '#3B82F6' },
      { id: genId(), name: 'Revision', color: '#EF4444' },
      { id: genId(), name: 'Delivered', color: '#10B981' },
    ],
    suggestedFields: [
      { id: genId(), key: 'client_name', name: 'Client', type: 'text', required: false, showOnCard: true },
      { id: genId(), key: 'deadline', name: 'Deadline', type: 'date', required: false, showOnCard: true },
      { id: genId(), key: 'project_value', name: 'Project Value', type: 'currency', required: false, showOnCard: true },
      { id: genId(), key: 'client_email', name: 'Client Email', type: 'email', required: false, showOnCard: false },
    ],
    defaultBoardName: 'Client Projects',
    defaultSettings: { showRevenue: true, showDueDate: true },
  },
  custom: {
    columns: [
      { id: genId(), name: 'To Do', color: '#94A3B8' },
      { id: genId(), name: 'In Progress', color: '#F59E0B' },
      { id: genId(), name: 'Done', color: '#10B981' },
    ],
    suggestedFields: [],
    defaultBoardName: 'My Board',
    defaultSettings: {},
  },
};

// Base fields that are always available
export const BASE_FIELDS: FieldDefinition[] = [
  { id: 'base-1', key: 'name', name: 'Name', type: 'text', required: true, showOnCard: true },
  { id: 'base-2', key: 'description', name: 'Description', type: 'text', required: false, showOnCard: false },
  { id: 'base-3', key: 'due_date', name: 'Due Date', type: 'date', required: false, showOnCard: true },
  { id: 'base-4', key: 'priority', name: 'Priority', type: 'select', required: false, showOnCard: true, options: ['Low', 'Medium', 'High', 'Urgent'] },
];

// Common additional fields
export const COMMON_FIELDS: FieldDefinition[] = [
  { id: 'common-1', key: 'tags', name: 'Tags', type: 'text', required: false, showOnCard: true },
  { id: 'common-2', key: 'notes', name: 'Notes', type: 'text', required: false, showOnCard: false },
  { id: 'common-3', key: 'link', name: 'Link/URL', type: 'url', required: false, showOnCard: false },
];

// Color palette for columns
export const COLUMN_COLORS = [
  '#94A3B8', // Slate
  '#3B82F6', // Blue
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#84CC16', // Lime
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#6366F1', // Indigo
];
