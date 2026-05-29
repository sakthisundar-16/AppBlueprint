export type RoleKey = 'admin' | 'user' | 'premium' | 'guest';

export interface Intent {
  appName: string;
  domain: string;
  features: {
    login: boolean;
    signup: boolean;
    contacts: boolean;
    dashboard: boolean;
    analytics: boolean;
    payments: boolean;
    premiumPlan: boolean;
    roleBasedAccess: boolean;
    adminInterface: boolean;
    members: boolean;
    events: boolean;
    groups: boolean;
    moderation: boolean;
    [key: string]: boolean;
  };
  entities: string[];
  roles: RoleKey[];
  assumptions: string[];
  conflictWarnings: string[];
  missingClarifications: string[];
}

export interface EntityField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'text' | 'json';
  required: boolean;
}

export interface RelationSchema {
  type: 'one-to-many' | 'many-to-one' | 'one-to-one';
  target: string;
  field: string;
}

export interface EntitySchema {
  name: string;
  fields: EntityField[];
  relations?: RelationSchema[];
}

export interface ComponentConfig {
  id: string;
  type: 'table' | 'form' | 'card' | 'chart' | 'detail';
  title: string;
  sourceApi: string;
  entity: string;
  fields: string[];
  actions?: string[];
}

export interface PageConfig {
  id: string;
  title: string;
  path: string;
  auth?: {
    allowRoles: RoleKey[];
  };
  sections: ComponentConfig[];
}

export interface ApiFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'date' | 'text' | 'json';
  required: boolean;
}

export interface ApiRoute {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  description: string;
  entity: string;
  requestSchema: Record<string, ApiFieldSchema>;
  responseSchema: Record<string, ApiFieldSchema>;
  auth?: {
    allowRoles: RoleKey[];
  };
}

export interface AuthRule {
  role: RoleKey;
  permissions: {
    entity: string;
    actions: ('read' | 'create' | 'update' | 'delete' | 'manage')[];
  }[];
}

export interface BusinessRule {
  id: string;
  description: string;
  subject: string;
  condition: string;
  effect: string;
}

export interface AppConfig {
  metadata: {
    name: string;
    domain: string;
    generatedAt: string;
    version: string;
  };
  intent: Intent;
  design: {
    pages: PageConfig[];
    apiRoutes: ApiRoute[];
    entities: EntitySchema[];
    dbSchema: EntitySchema[];
    authRules: AuthRule[];
    businessRules: BusinessRule[];
  };
  runtime: {
    entrypoint: string;
  };
  warnings: string[];
  clarifications: string[];
}

export interface PipelineResult {
  config: AppConfig | null;
  valid: boolean;
  warnings: string[];
  clarifications: string[];
  errors: string[];
  repairs: number;
  runtimeValid: boolean;
  runtimeIssues: string[];
  latencyMs: number;
}

export interface EvaluationPrompt {
  id: string;
  prompt: string;
  category: 'real' | 'vague' | 'conflict' | 'incomplete';
  expectation: string;
}

export interface EvaluationOutcome {
  promptId: string;
  success: boolean;
  retries: number;
  failureType?: string;
  warnings: string[];
  clarifications: string[];
  latencyMs: number;
}
