// Project Designer Types

export type UseCaseType = 
  | 'leads' 
  | 'content' 
  | 'products' 
  | 'events' 
  | 'projects' 
  | 'custom';

export interface ColumnDefinition {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'email' 
  | 'phone' 
  | 'url' 
  | 'select' 
  | 'currency';

export interface FieldDefinition {
  id: string;
  key: string;
  name: string;
  type: FieldType;
  required: boolean;
  showOnCard: boolean;
  options?: string[]; // For select type
}

export interface BoardSettings {
  defaultView: 'kanban' | 'list';
  showProgressBar: boolean;
  showDueDate: boolean;
  showRevenue: boolean;
  compactCards: boolean;
  themeColor: string;
}

export interface ProjectDesignerData {
  useCase: UseCaseType;
  customDescription: string;
  columns: ColumnDefinition[];
  fields: FieldDefinition[];
  boardName: string;
  settings: BoardSettings;
  saveAsTemplate: boolean;
  templateName: string;
}

export const DEFAULT_PROJECT_DESIGNER_DATA: ProjectDesignerData = {
  useCase: 'projects',
  customDescription: '',
  columns: [
    { id: '1', name: 'To Do', color: '#94A3B8' },
    { id: '2', name: 'In Progress', color: '#F59E0B' },
    { id: '3', name: 'Done', color: '#10B981' },
  ],
  fields: [
    { id: '1', key: 'name', name: 'Name', type: 'text', required: true, showOnCard: true },
    { id: '2', key: 'description', name: 'Description', type: 'text', required: false, showOnCard: false },
    { id: '3', key: 'due_date', name: 'Due Date', type: 'date', required: false, showOnCard: true },
  ],
  boardName: '',
  settings: {
    defaultView: 'kanban',
    showProgressBar: true,
    showDueDate: true,
    showRevenue: false,
    compactCards: false,
    themeColor: '#6366F1',
  },
  saveAsTemplate: false,
  templateName: '',
};

export const USE_CASE_OPTIONS = [
  { 
    value: 'leads' as UseCaseType, 
    label: 'Clients or Leads', 
    description: 'Track coaching clients, consulting leads, or sales pipeline',
    icon: 'Users'
  },
  { 
    value: 'content' as UseCaseType, 
    label: 'Content', 
    description: 'Manage blog posts, videos, podcasts, or social content',
    icon: 'FileText'
  },
  { 
    value: 'products' as UseCaseType, 
    label: 'Products or Offers', 
    description: 'Plan launches, digital products, or service offerings',
    icon: 'Package'
  },
  { 
    value: 'events' as UseCaseType, 
    label: 'Events', 
    description: 'Organize webinars, summits, workshops, or live events',
    icon: 'Calendar'
  },
  { 
    value: 'projects' as UseCaseType, 
    label: 'Projects', 
    description: 'Manage client work, internal initiatives, or team projects',
    icon: 'Briefcase'
  },
  { 
    value: 'custom' as UseCaseType, 
    label: 'Custom', 
    description: 'Design your own workflow from scratch',
    icon: 'Wand2'
  },
];
