import { EvaluationOutcome, EvaluationPrompt } from './types';
import { runPipeline } from './pipeline';

const prompts: EvaluationPrompt[] = [
  {
    id: 'real-01',
    prompt: 'Build a CRM with login, contacts, dashboard, role-based access, and premium plan with payments. Admins can see analytics.',
    category: 'real',
    expectation: 'Fully-configured CRM with auth, contact management, premium gating, admin analytics, and dashboard pages.',
  },
  {
    id: 'real-02',
    prompt: 'Create a simple inventory management app with product lists, stock alerts, login, and admin controls.',
    category: 'real',
    expectation: 'Inventory app with product entities, stock monitoring, login, and admin pages.',
  },
  {
    id: 'real-03',
    prompt: 'Make a booking app for appointments with service catalog, user profiles, payment checkout, and staff dashboard.',
    category: 'real',
    expectation: 'Appointment booking system with profiles, payments, service listing, and staff dashboard.',
  },
  {
    id: 'real-04',
    prompt: 'Build a membership portal with membership tiers, gated resources, analytics for admins, and payment subscription flow.',
    category: 'real',
    expectation: 'Membership portal with roles, premium gating, analytics, and payments.',
  },
  {
    id: 'real-05',
    prompt: 'Create a customer support desk with ticket management, agent login, reporting, and SLA status.',
    category: 'real',
    expectation: 'Support desk with ticket entity, agent/admin roles, reports, and dashboard metrics.',
  },
  {
    id: 'real-06',
    prompt: 'Design a course platform with student login, course library, instructor dashboard, and subscription plan.',
    category: 'real',
    expectation: 'Course platform with auth, course listing, instructor analytics, and subscription pages.',
  },
  {
    id: 'real-07',
    prompt: 'Create a job board with employer login, applicant tracking, paid featured listings, and admin controls.',
    category: 'real',
    expectation: 'Job board with auth, application tracking, payment plans, and admin review pages.',
  },
  {
    id: 'real-08',
    prompt: 'Build a marketplace with seller accounts, product catalogs, checkout, and admin sales analytics.',
    category: 'real',
    expectation: 'Marketplace with seller onboarding, product listings, payments, and analytics.',
  },
  {
    id: 'real-09',
    prompt: 'Make a community platform with member profiles, event calendar, premium groups, and moderation tools.',
    category: 'real',
    expectation: 'Community app with member auth, premium group plan, events, and moderator admin areas.',
  },
  {
    id: 'real-10',
    prompt: 'Create a product feedback app with stakeholder login, idea boards, status tracking, and analytics.',
    category: 'real',
    expectation: 'Feedback app with auth, boards, plus analytics for executives.',
  },
  {
    id: 'edge-01',
    prompt: 'Build an app.',
    category: 'incomplete',
    expectation: 'Clarification required because the prompt is too vague.',
  },
  {
    id: 'edge-02',
    prompt: 'Build a product with login and no user management, but must support unlimited admin roles and free access.',
    category: 'conflict',
    expectation: 'Conflict detection and assumptions around role-based access.',
  },
  {
    id: 'edge-03',
    prompt: 'Create a CRM with contacts but without authentication.',
    category: 'conflict',
    expectation: 'Assume auth is required for CRM and document the assumption, or request clarification.',
  },
  {
    id: 'edge-04',
    prompt: 'Make a sales app with dashboard, but do not include any pages.',
    category: 'conflict',
    expectation: 'Resolve underspecified UI by generating a dashboard page and documenting the assumption.',
  },
  {
    id: 'edge-05',
    prompt: 'Create a marketplace with premium plans and analytics but no payment mention.',
    category: 'vague',
    expectation: 'Infer payments from premium requirement and include it in the output.',
  },
  {
    id: 'edge-06',
    prompt: 'Build a system that tracks orders, inventory, and shipping with admin analytics.',
    category: 'real',
    expectation: 'Produce order/inventory entities plus analytics and admin pages.',
  },
  {
    id: 'edge-07',
    prompt: 'Design a simple app with login, contacts, and premium content but leave auth unspecified.',
    category: 'vague',
    expectation: 'Add auth rules and premium gating assumptions.',
  },
  {
    id: 'edge-08',
    prompt: 'Make a CRM with login, dashboard, and analytics, but the user wants only guest access.',
    category: 'conflict',
    expectation: 'Detect role conflict and either ask for clarification or enforce sensible access roles.',
  },
  {
    id: 'edge-09',
    prompt: 'Build a membership portal only with a plan page and no user login.',
    category: 'incomplete',
    expectation: 'Require clarification because paid access without login is underspecified.',
  },
  {
    id: 'edge-10',
    prompt: 'Create a CRM with login, contacts, and payments. Admins should not see analytics.',
    category: 'conflict',
    expectation: 'Respect the stated restriction and avoid generating analytics if not requested explicitly.',
  },
];

function evaluate(): { metrics: Record<string, number>; outcomes: EvaluationOutcome[] } {
  const outcomes: EvaluationOutcome[] = [];
  let successCount = 0;
  let totalRetries = 0;
  let clarificationFailures = 0;
  let validationFailures = 0;
  const failureTypes: Record<string, number> = {};

  for (const prompt of prompts) {
    const result = runPipeline(prompt.prompt);
    const success = result.valid && result.clarifications.length === 0;
    if (success) {
      successCount += 1;
    } else {
      const failureType = result.clarifications.length > 0 ? 'clarification' : result.errors.length > 0 ? 'validation' : 'unknown';
      failureTypes[failureType] = (failureTypes[failureType] || 0) + 1;
      if (failureType === 'clarification') clarificationFailures += 1;
      if (failureType === 'validation') validationFailures += 1;
    }
    totalRetries += result.repairs;
    outcomes.push({
      promptId: prompt.id,
      success,
      retries: result.repairs,
      failureType: success ? undefined : result.clarifications.length > 0 ? 'clarification' : result.errors.length > 0 ? 'validation' : 'unknown',
      warnings: result.warnings,
      clarifications: result.clarifications,
      latencyMs: result.latencyMs,
    });
  }

  return {
    metrics: {
      total: prompts.length,
      success: successCount,
      failure: prompts.length - successCount,
      clarificationFailures,
      validationFailures,
      averageRetries: totalRetries / prompts.length,
      averageLatencyMs: outcomes.reduce((sum, item) => sum + item.latencyMs, 0) / prompts.length,
      successRate: Number(((successCount / prompts.length) * 100).toFixed(1)),
    },
    outcomes,
  };
}

const report = evaluate();
console.log('Evaluation metrics:');
console.table(report.metrics);
console.log('Outcome summary:');
report.outcomes.forEach((item) => {
  console.log(`${item.promptId} => success=${item.success} retries=${item.retries} failure=${item.failureType || 'none'}`);
});
