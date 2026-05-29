import { AppConfig, ApiFieldSchema, ApiRoute, AuthRule, BusinessRule, ComponentConfig, EntityField, EntitySchema, Intent, PageConfig, PipelineResult, RoleKey } from './types';
import { validateRuntime } from './runtime';

const featureMatchers = {
  login: [/\blogin\b/, /\bsign in\b/, /\bauth\b/, /\buser auth\b/],
  signup: [/\bsignup\b/, /\bregister\b/, /\bcreate account\b/],
  contacts: [/\bcontact(s)?\b/, /\bcrm\b/, /\baddress book\b/],
  dashboard: [/\bdashboard\b/, /\bhome page\b/, /\banalytics\b/],
  analytics: [/\banalytics\b/, /\breport(s)?\b/, /\bmetrics\b/],
  payments: [/\bpayment(s)?\b/, /\bstripe\b/, /\bplan(s)?\b/, /\bbilling\b/],
  premiumPlan: [/\bpremium\b/, /\bpaid plan\b/, /\bsubscription\b/],
  roleBasedAccess: [/\brole-based\b/, /\brole based\b/, /\broles\b/, /\bpermissions\b/],
  adminInterface: [/\badmin\b/, /\badministrat(or|ive)\b/, /\bback office\b/],
  members: [/\bmember(s)?\b/, /\bprofiles\b/, /\bcommunity\b/],
  events: [/\bevent(s)?\b/, /\bcalendar\b/, /\bschedule\b/],
  groups: [/\bgroup(s)?\b/, /\bcommunities\b/, /\bpremium groups\b/],
  moderation: [/\bmoderation\b/, /\bmoderator(s)?\b/, /\breport(s)?\b/, /\badmin tools\b/],
};

function findFeature(prompt: string, regexes: RegExp[]): boolean {
  return regexes.some((pattern) => pattern.test(prompt));
}

export function extractIntent(prompt: string): Intent {
  const lower = prompt.toLowerCase();
  const features = Object.fromEntries(
    Object.entries(featureMatchers).map(([key, patterns]) => [key, findFeature(lower, patterns)])
  ) as Intent['features'];

  const domain = findFeature(lower, [/\bcrm\b/, /\bcustomer relationship management\b/]) ? 'crm' : 'generic-business';
  const appName = domain === 'crm' ? 'CRM Application' : 'Business App';
  const roles: RoleKey[] = ['user'];
  const assumptions: string[] = [];
  const conflictWarnings: string[] = [];
  const missingClarifications: string[] = [];

  if (features.adminInterface || features.analytics || features.roleBasedAccess) {
    roles.push('admin');
  }

  if (features.premiumPlan || features.payments) {
    roles.push('premium');
  }

  if (features.login || features.signup) {
    roles.push('guest');
  }

  if (!features.login && !features.signup && (features.contacts || features.dashboard || features.analytics || features.payments)) {
    assumptions.push('Login will be required because the app exposes user-specific CRM and admin features.');
    features.login = true;
  }

  if (!features.signup && features.login) {
    assumptions.push('Signup will be available by default alongside login to support account creation.');
    features.signup = true;
  }

  if (features.premiumPlan && !features.payments) {
    assumptions.push('Payments are inferred from premium plan requirements.');
    features.payments = true;
  }

  if (!features.contacts && !features.dashboard && !features.analytics && !features.payments) {
    missingClarifications.push('The prompt is underspecified. Please clarify the primary user flows, pages, and data entities.');
  }

  if (features.adminInterface && !features.roleBasedAccess) {
    assumptions.push('Admin interface will be restricted with role-based access by default.');
    features.roleBasedAccess = true;
  }

  const entities: string[] = ['User'];
  if (features.contacts) entities.push('Contact');
  if (features.payments) {
    entities.push('Plan');
    entities.push('Payment');
  }
  if (features.analytics) entities.push('AnalyticsEvent');
  if (features.members) entities.push('Member');
  if (features.events) entities.push('Event');
  if (features.groups) entities.push('Group');
  if (features.moderation) entities.push('ModerationRecord');

  return {
    appName,
    domain,
    features,
    entities,
    roles: Array.from(new Set(roles)),
    assumptions,
    conflictWarnings,
    missingClarifications,
  };
}

function createEntity(name: string, fields: EntityField[], relations?: EntitySchema['relations']): EntitySchema {
  return { name, fields, relations };
}

function typedField(name: string, type: ApiFieldSchema['type'], required = true): EntityField {
  return { name, type, required };
}

function buildEntityFieldMap(entity: EntitySchema) {
  return Object.fromEntries(entity.fields.map((field) => [field.name, field]));
}

function findRouteBySourceApi(sourceApi: string, routes: ApiRoute[]) {
  return routes.find((route) => route.path === sourceApi || route.id === sourceApi.replace('/api/', ''));
}

function isSpecialEntityField(fieldName: string) {
  return [
    'token',
    'status',
    'userId',
    'paymentId',
    'availableActions',
    'createdAt',
    'updatedAt',
    'contactsCount',
    'activePlan',
  ].includes(fieldName);
}

export function designSystem(intent: Intent) {
  const pages: PageConfig[] = [];
  const apiRoutes: ApiRoute[] = [];
  const entities: EntitySchema[] = [];
  const authRules: AuthRule[] = [];
  const businessRules: BusinessRule[] = [];

  const baseRoles = intent.roles;

  if (intent.features.login) {
    pages.push({
      id: 'login',
      title: 'Login',
      path: '/login',
      sections: [
        {
          id: 'login-form',
          type: 'form',
          title: 'Sign in',
          sourceApi: '/api/auth/login',
          entity: 'User',
          fields: ['email', 'password'],
          actions: ['submit'],
        },
      ],
    });

    apiRoutes.push({
      id: 'auth-login',
      path: '/api/auth/login',
      method: 'POST',
      description: 'Authenticate a user and return a valid session token.',
      entity: 'User',
      requestSchema: {
        email: { type: 'string', required: true },
        password: { type: 'string', required: true },
      },
      responseSchema: {
        token: { type: 'string', required: true },
        userId: { type: 'string', required: true },
      },
      auth: { allowRoles: ['guest', 'user', 'premium', 'admin'] },
    });

    apiRoutes.push({
      id: 'auth-signup',
      path: '/api/auth/signup',
      method: 'POST',
      description: 'Create a new user account.',
      entity: 'User',
      requestSchema: {
        name: { type: 'string', required: true },
        email: { type: 'string', required: true },
        password: { type: 'string', required: true },
      },
      responseSchema: {
        userId: { type: 'string', required: true },
      },
      auth: { allowRoles: ['guest', 'user', 'premium', 'admin'] },
    });

    entities.push(
      createEntity('User', [
        typedField('id', 'string'),
        typedField('name', 'string'),
        typedField('email', 'string'),
        typedField('password', 'string'),
        typedField('role', 'string'),
        typedField('planId', 'string', false),
      ], [{ type: 'one-to-many', target: 'Contact', field: 'userId' }])
    );
  }

  if (intent.features.contacts) {
    pages.push({
      id: 'contacts',
      title: 'Contacts',
      path: '/contacts',
      auth: { allowRoles: ['user', 'premium', 'admin'] },
      sections: [
        {
          id: 'contacts-table',
          type: 'table',
          title: 'Contacts',
          sourceApi: '/api/contacts',
          entity: 'Contact',
          fields: ['name', 'company', 'email', 'phone'],
          actions: ['create', 'edit', 'delete'],
        },
      ],
    });

    apiRoutes.push({
      id: 'contacts-list',
      path: '/api/contacts',
      method: 'GET',
      description: 'List contacts for the current user.',
      entity: 'Contact',
      requestSchema: {},
      responseSchema: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        company: { type: 'string', required: false },
        email: { type: 'string', required: true },
        phone: { type: 'string', required: false },
      },
      auth: { allowRoles: ['user', 'premium', 'admin'] },
    });

    apiRoutes.push({
      id: 'contacts-create',
      path: '/api/contacts',
      method: 'POST',
      description: 'Create a new contact.',
      entity: 'Contact',
      requestSchema: {
        name: { type: 'string', required: true },
        email: { type: 'string', required: true },
        company: { type: 'string', required: false },
        phone: { type: 'string', required: false },
      },
      responseSchema: {
        id: { type: 'string', required: true },
      },
      auth: { allowRoles: ['user', 'premium', 'admin'] },
    });

    entities.push(
      createEntity('Contact', [
        typedField('id', 'string'),
        typedField('userId', 'string'),
        typedField('name', 'string'),
        typedField('company', 'string', false),
        typedField('email', 'string'),
        typedField('phone', 'string', false),
      ], [{ type: 'many-to-one', target: 'User', field: 'userId' }])
    );
  }

  if (intent.features.members || intent.features.events || intent.features.groups) {
    pages.push({
      id: 'community',
      title: 'Community',
      path: '/community',
      auth: { allowRoles: ['user', 'premium', 'admin'] },
      sections: ([
        {
          id: 'member-list',
          type: 'table' as const,
          title: 'Members',
          sourceApi: '/api/members',
          entity: 'Member',
          fields: ['name', 'bio', 'status'],
          actions: ['view', 'message'],
        },
        {
          id: 'event-list',
          type: 'table' as const,
          title: 'Events',
          sourceApi: '/api/events',
          entity: 'Event',
          fields: ['title', 'date', 'location'],
          actions: ['register'],
        },
      ] as ComponentConfig[]).filter(Boolean),
    });

    if (intent.features.groups) {
      pages.push({
        id: 'groups',
        title: 'Groups',
        path: '/groups',
        auth: { allowRoles: ['user', 'premium', 'admin'] },
        sections: [
          {
            id: 'group-list',
            type: 'table',
            title: 'Groups',
            sourceApi: '/api/groups',
            entity: 'Group',
            fields: ['name', 'description', 'premium'],
            actions: ['join', 'view'],
          },
        ],
      });
    }

    apiRoutes.push({
      id: 'members-list',
      path: '/api/members',
      method: 'GET',
      description: 'List community members.',
      entity: 'Member',
      requestSchema: {},
      responseSchema: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        bio: { type: 'text', required: false },
        status: { type: 'string', required: false },
      },
      auth: { allowRoles: ['user', 'premium', 'admin'] },
    });

    apiRoutes.push({
      id: 'events-list',
      path: '/api/events',
      method: 'GET',
      description: 'List community events.',
      entity: 'Event',
      requestSchema: {},
      responseSchema: {
        id: { type: 'string', required: true },
        title: { type: 'string', required: true },
        date: { type: 'date', required: true },
        location: { type: 'string', required: false },
      },
      auth: { allowRoles: ['user', 'premium', 'admin'] },
    });

    entities.push(
      createEntity('Member', [
        typedField('id', 'string'),
        typedField('name', 'string'),
        typedField('bio', 'text', false),
        typedField('status', 'string', false),
        typedField('joinedAt', 'date', false),
      ])
    );

    entities.push(
      createEntity('Event', [
        typedField('id', 'string'),
        typedField('title', 'string'),
        typedField('description', 'text', false),
        typedField('date', 'date'),
        typedField('location', 'string', false),
      ])
    );

    if (intent.features.groups) {
      apiRoutes.push({
        id: 'groups-list',
        path: '/api/groups',
        method: 'GET',
        description: 'List available groups including premium groups.',
        entity: 'Group',
        requestSchema: {},
        responseSchema: {
          id: { type: 'string', required: true },
          name: { type: 'string', required: true },
          description: { type: 'text', required: false },
          premium: { type: 'boolean', required: true },
        },
        auth: { allowRoles: ['user', 'premium', 'admin'] },
      });

      entities.push(
        createEntity('Group', [
          typedField('id', 'string'),
          typedField('name', 'string'),
          typedField('description', 'text', false),
          typedField('premium', 'boolean'),
          typedField('createdAt', 'date', false),
        ])
      );
    }

    if (intent.features.moderation) {
      pages.push({
        id: 'moderation',
        title: 'Moderation',
        path: '/moderation',
        auth: { allowRoles: ['admin'] },
        sections: [
          {
            id: 'moderation-dashboard',
            type: 'table',
            title: 'Moderation Queue',
            sourceApi: '/api/moderation',
            entity: 'ModerationRecord',
            fields: ['subject', 'status', 'submittedBy'],
            actions: ['review', 'resolve'],
          },
        ],
      });

      apiRoutes.push({
        id: 'moderation-list',
        path: '/api/moderation',
        method: 'GET',
        description: 'List moderation records for admin review.',
        entity: 'ModerationRecord',
        requestSchema: {},
        responseSchema: {
          id: { type: 'string', required: true },
          subject: { type: 'string', required: true },
          status: { type: 'string', required: true },
          submittedBy: { type: 'string', required: true },
        },
        auth: { allowRoles: ['admin'] },
      });

      entities.push(
        createEntity('ModerationRecord', [
          typedField('id', 'string'),
          typedField('subject', 'string'),
          typedField('status', 'string'),
          typedField('submittedBy', 'string'),
          typedField('createdAt', 'date'),
        ])
      );

      businessRules.push({
        id: 'admin-moderation-only',
        description: 'Moderation features must only be accessible to admins.',
        subject: 'ModerationPage',
        condition: 'user.role === admin',
        effect: 'grant access',
      });
    }
  }

  if (intent.features.dashboard) {
    pages.push({
      id: 'dashboard',
      title: 'Dashboard',
      path: '/dashboard',
      auth: { allowRoles: ['user', 'premium', 'admin'] },
      sections: [
        {
          id: 'metrics-card',
          type: 'card',
          title: 'Overview',
          sourceApi: '/api/dashboard/summary',
          entity: 'User',
          fields: ['contactsCount', 'activePlan'],
        },
      ],
    });

    apiRoutes.push({
      id: 'dashboard-summary',
      path: '/api/dashboard/summary',
      method: 'GET',
      description: 'Provide overview metrics for the signed-in user.',
      entity: 'User',
      requestSchema: {},
      responseSchema: {
        contactsCount: { type: 'number', required: true },
        activePlan: { type: 'string', required: false },
        availableActions: { type: 'json', required: false },
      },
      auth: { allowRoles: ['user', 'premium', 'admin'] },
    });
  }

  if (intent.features.payments) {
    pages.push({
      id: 'plans',
      title: 'Plans',
      path: '/plans',
      auth: { allowRoles: ['user', 'premium', 'admin'] },
      sections: [
        {
          id: 'plan-list',
          type: 'table',
          title: 'Plans',
          sourceApi: '/api/plans',
          entity: 'Plan',
          fields: ['name', 'price', 'features'],
          actions: ['select'],
        },
        {
          id: 'checkout-form',
          type: 'form',
          title: 'Subscribe',
          sourceApi: '/api/payments/subscribe',
          entity: 'Payment',
          fields: ['planId', 'paymentMethod'],
          actions: ['submit'],
        },
      ],
    });

    apiRoutes.push({
      id: 'plans-list',
      path: '/api/plans',
      method: 'GET',
      description: 'List available pricing plans.',
      entity: 'Plan',
      requestSchema: {},
      responseSchema: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        price: { type: 'number', required: true },
        features: { type: 'text', required: false },
      },
      auth: { allowRoles: ['user', 'premium', 'admin'] },
    });

    apiRoutes.push({
      id: 'payments-subscribe',
      path: '/api/payments/subscribe',
      method: 'POST',
      description: 'Subscribe a user to a selected plan.',
      entity: 'Payment',
      requestSchema: {
        userId: { type: 'string', required: true },
        planId: { type: 'string', required: true },
        paymentMethod: { type: 'string', required: true },
      },
      responseSchema: {
        paymentId: { type: 'string', required: true },
        status: { type: 'string', required: true },
      },
      auth: { allowRoles: ['user', 'premium', 'admin'] },
    });

    entities.push(
      createEntity('Plan', [
        typedField('id', 'string'),
        typedField('name', 'string'),
        typedField('price', 'number'),
        typedField('features', 'text', false),
      ])
    );

    entities.push(
      createEntity('Payment', [
        typedField('id', 'string'),
        typedField('userId', 'string'),
        typedField('planId', 'string'),
        typedField('status', 'string'),
        typedField('paymentMethod', 'string'),
        typedField('createdAt', 'date'),
      ], [{ type: 'many-to-one', target: 'User', field: 'userId' }])
    );
  }

  if (intent.features.analytics) {
    pages.push({
      id: 'analytics',
      title: 'Analytics',
      path: '/analytics',
      auth: { allowRoles: ['admin'] },
      sections: [
        {
          id: 'analytics-chart',
          type: 'chart',
          title: 'Usage Analytics',
          sourceApi: '/api/analytics',
          entity: 'AnalyticsEvent',
          fields: ['eventType', 'eventCount'],
        },
      ],
    });

    apiRoutes.push({
      id: 'analytics-list',
      path: '/api/analytics',
      method: 'GET',
      description: 'Return analytics events and aggregated metrics.',
      entity: 'AnalyticsEvent',
      requestSchema: {},
      responseSchema: {
        eventType: { type: 'string', required: true },
        eventCount: { type: 'number', required: true },
        updatedAt: { type: 'date', required: true },
      },
      auth: { allowRoles: ['admin'] },
    });

    entities.push(
      createEntity('AnalyticsEvent', [
        typedField('id', 'string'),
        typedField('eventType', 'string'),
        typedField('eventCount', 'number'),
        typedField('updatedAt', 'date'),
      ])
    );

    businessRules.push({
      id: 'admin-view-analytics',
      description: 'Only admins may view analytics dashboards.',
      subject: 'AnalyticsPage',
      condition: 'user.role === admin',
      effect: 'grant access',
    });
  }

  authRules.push(
    {
      role: 'admin',
      permissions: entities.map((entity) => ({
        entity: entity.name,
        actions: ['read', 'create', 'update', 'delete', 'manage'],
      })),
    },
    {
      role: 'premium',
      permissions: entities.map((entity) => ({
        entity: entity.name,
        actions: ['read', 'create', 'update', 'delete'],
      })),
    },
    {
      role: 'user',
      permissions: entities
        .filter((entity) => entity.name !== 'AnalyticsEvent')
        .map((entity) => ({
          entity: entity.name,
          actions: ['read', 'create', 'update'],
        })),
    }
  );

  if (intent.features.login || intent.features.signup) {
    authRules.push({ role: 'guest', permissions: [] });
  }

  if (intent.features.premiumPlan) {
    businessRules.push({
      id: 'premium-gating',
      description: 'Premium content should only be available to premium subscribers.',
      subject: 'PlanAccess',
      condition: "user.planId !== ''",
      effect: 'grant premium access',
    });
  }

  return { pages, apiRoutes, entities, dbSchema: entities, authRules, businessRules };
}

function normalizeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function validateEntityReference(entityName: string, entities: EntitySchema[]) {
  return entities.some((entity) => entity.name === entityName);
}

export function createAppConfig(intent: Intent, design: ReturnType<typeof designSystem>): AppConfig {
  return {
    metadata: {
      name: intent.appName,
      domain: intent.domain,
      generatedAt: new Date().toISOString(),
      version: '1.0.0',
    },
    intent,
    design,
    runtime: {
      entrypoint: 'src/server.ts',
    },
    warnings: [],
    clarifications: intent.missingClarifications,
  };
}

export function validateConfig(config: AppConfig) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.metadata.name || !config.metadata.domain) {
    errors.push('Metadata must include a name and domain.');
  }

  if (config.design.pages.length === 0) {
    errors.push('At least one UI page is required.');
  }

  const apiIds = config.design.apiRoutes.map((route) => route.id);
  const authRoleNames = config.design.authRules.map((rule) => rule.role);
  const routePaths = new Set<string>();
  const pagePaths = new Set<string>();

  for (const route of config.design.apiRoutes) {
    if (routePaths.has(route.path)) {
      errors.push(`Duplicate API path found: ${route.path}.`);
    }
    routePaths.add(route.path);

    if (!validateEntityReference(route.entity, config.design.entities)) {
      errors.push(`API route ${route.id} references unknown entity ${route.entity}.`);
      continue;
    }

    if (!route.auth || !route.auth.allowRoles?.length) {
      warnings.push(`API route ${route.id} has no auth roles defined.`);
    } else {
      route.auth.allowRoles.forEach((role) => {
        if (!authRoleNames.includes(role)) {
          errors.push(`API route ${route.id} uses unknown auth role ${role}.`);
        }
      });
    }

    const entity = config.design.entities.find((item) => item.name === route.entity);
    const entityFieldMap = entity ? buildEntityFieldMap(entity) : {};
    for (const [fieldName, fieldSchema] of Object.entries(route.responseSchema)) {
      if (!entityFieldMap[fieldName] && !isSpecialEntityField(fieldName)) {
        warnings.push(`API response field ${route.id}.${fieldName} is not defined on entity ${route.entity}.`);
      }
      if (fieldSchema.required && !fieldSchema.type) {
        errors.push(`Response field ${route.id}.${fieldName} must declare a type.`);
      }
    }

    for (const [fieldName, fieldSchema] of Object.entries(route.requestSchema)) {
      if (!entityFieldMap[fieldName] && !isSpecialEntityField(fieldName)) {
        warnings.push(`API request field ${route.id}.${fieldName} is not defined on entity ${route.entity}.`);
      }
      if (fieldSchema.required && !fieldSchema.type) {
        errors.push(`Request field ${route.id}.${fieldName} must declare a type.`);
      }
    }

    if (['POST', 'PUT', 'PATCH'].includes(route.method) && Object.keys(route.requestSchema).length === 0) {
      warnings.push(`API route ${route.id} may require a request body schema for write operations.`);
    }
  }

  for (const page of config.design.pages) {
    if (pagePaths.has(page.path)) {
      errors.push(`Duplicate page path found: ${page.path}.`);
    }
    pagePaths.add(page.path);

    if (page.auth) {
      page.auth.allowRoles.forEach((role) => {
        if (!authRoleNames.includes(role)) {
          errors.push(`Page ${page.id} uses unknown auth role ${role}.`);
        }
      });
    } else if (config.intent.features.login && !['login', 'signup'].includes(page.id)) {
      warnings.push(`Page ${page.id} does not define auth rules, but login is required by the app.`);
    }

    for (const section of page.sections) {
      const route = findRouteBySourceApi(section.sourceApi, config.design.apiRoutes);
      if (!route) {
        errors.push(`UI section ${section.id} references unknown API ${section.sourceApi}.`);
        continue;
      }

      if (route.entity !== section.entity) {
        errors.push(`UI section ${section.id} expects entity ${section.entity} but API ${route.id} is tied to ${route.entity}.`);
      }

      const requestSchema = route.requestSchema;
      const responseSchema = route.responseSchema;
      for (const field of section.fields) {
        if (section.type === 'form') {
          if (!requestSchema[field] && !isSpecialEntityField(field)) {
            warnings.push(`Form ${section.id} field ${field} is not present in request schema for API ${route.id}.`);
          }
        } else {
          if (!responseSchema[field] && !isSpecialEntityField(field)) {
            warnings.push(`Component ${section.id} field ${field} is not present in response schema for API ${route.id}.`);
          }
        }
      }
    }
  }

  for (const rule of config.design.authRules) {
    if (rule.permissions.length === 0) {
      warnings.push(`Auth role ${rule.role} has no permissions assigned.`);
    }
  }

  return { errors, warnings };
}

export function repairConfig(config: AppConfig) {
  let repairs = 0;
  const fixed = { ...config, design: { ...config.design } };
  fixed.design.apiRoutes = fixed.design.apiRoutes.map((route) => ({ ...route }));
  fixed.design.pages = fixed.design.pages.map((page) => ({ ...page, sections: page.sections.map((section) => ({ ...section })) }));

  const authRoleNames = fixed.design.authRules.map((rule) => rule.role);
  const routePaths = new Set<string>();

  fixed.design.apiRoutes = fixed.design.apiRoutes.map((route) => {
    if (!validateEntityReference(route.entity, fixed.design.entities)) {
      const fallbackEntity = fixed.design.entities[0]?.name ?? 'User';
      repairs += 1;
      route = { ...route, entity: fallbackEntity };
    }

    if (!route.auth || !route.auth.allowRoles?.length) {
      repairs += 1;
      return { ...route, auth: { allowRoles: authRoleNames.length ? authRoleNames : ['user'] } };
    }

    const uniquePath = route.path + (routePaths.has(route.path) ? `-${Math.random().toString(36).slice(2, 5)}` : '');
    if (uniquePath !== route.path) {
      repairs += 1;
      route = { ...route, path: uniquePath };
    }
    routePaths.add(route.path);
    return route;
  });

  fixed.design.pages = fixed.design.pages.map((page) => {
    const sections = page.sections.map((section) => {
      const matchingRoute = findRouteBySourceApi(section.sourceApi, fixed.design.apiRoutes);
      if (!matchingRoute) {
        const fallback = fixed.design.apiRoutes.find((route) => route.entity === section.entity);
        if (fallback) {
          repairs += 1;
          return { ...section, sourceApi: fallback.path };
        }
      }
      return section;
    });

    if (!page.auth && config.intent.features.login) {
      repairs += 1;
      return { ...page, auth: { allowRoles: ['user', 'premium', 'admin'] }, sections };
    }

    if (page.auth) {
      const allowRoles = page.auth.allowRoles.map((role) => {
        if (!authRoleNames.includes(role)) {
          repairs += 1;
          return 'user';
        }
        return role;
      });
      return { ...page, auth: { allowRoles }, sections };
    }

    return { ...page, sections };
  });

  return { config: fixed, repairs };
}

export function runPipeline(prompt: string): PipelineResult {
  const start = Date.now();
  const intent = extractIntent(prompt);
  const design = designSystem(intent);
  const config = createAppConfig(intent, design);
  const validation = validateConfig(config);
  const errors = [...validation.errors];
  let repairs = 0;
  const warnings = [...validation.warnings, ...intent.assumptions, ...intent.conflictWarnings];
  const clarifications = [...intent.missingClarifications];

  let finalConfig = config;
  if (errors.length > 0) {
    const repaired = repairConfig(finalConfig);
    repairs = repaired.repairs;
    finalConfig = repaired.config;
    const secondValidation = validateConfig(finalConfig);
    errors.length = 0;
    errors.push(...secondValidation.errors);
    warnings.push(...secondValidation.warnings);
  }

  const runtimeIssues = validateRuntime(finalConfig);
  const runtimeValid = runtimeIssues.length === 0;
  if (!runtimeValid) {
    errors.push(...runtimeIssues);
  }

  const valid = errors.length === 0 && clarifications.length === 0;
  return {
    config: finalConfig,
    valid,
    warnings,
    clarifications,
    errors,
    repairs,
    runtimeValid,
    runtimeIssues,
    latencyMs: Date.now() - start,
  };
}

export function makeIdentifier(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
