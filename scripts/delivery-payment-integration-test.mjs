import { PrismaClient } from '@prisma/client';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
const unique = Date.now();
const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, data };
}

async function register(role, prefix) {
  const email = `${prefix}_${unique}@test.local`;
  const password = 'Pass1234!';
  const result = await api('/auth/register', {
    method: 'POST',
    body: { email, password, role },
  });
  assert(result.status === 201, `register failed for ${role}: ${result.status}`);
  return {
    email,
    password,
    userId: result.data.user.id,
    token: result.data.accessToken,
  };
}

async function run() {
  const report = [];
  const add = (name, ok, detail = '') => report.push({ name, ok, detail });

  // Auth + actors
  const customer = await register('CUSTOMER', 'customer');
  const freelancer = await register('FREELANCER', 'freelancer');
  const otherFreelancer = await register('FREELANCER', 'otherfreelancer');
  const arbiter = await register('ARBITER', 'arbiter');

  // Setup flow: job -> bid -> accept -> project -> milestone
  const job = await api('/jobs', {
    method: 'POST',
    token: customer.token,
    body: {
      title: `Delivery Payment Test ${unique}`,
      description: 'Integration flow for delivery/payment',
      budgetMin: 100,
      budgetMax: 200,
      currency: 'TRY',
    },
  });
  assert(job.status === 201, `job create failed: ${job.status}`);
  const jobId = job.data.id;

  const bid = await api(`/jobs/${jobId}/bids`, {
    method: 'POST',
    token: freelancer.token,
    body: {
      proposedAmount: 150,
      deliveryDays: 3,
      coverLetter: 'Can deliver fast',
    },
  });
  assert(bid.status === 201, `bid create failed: ${bid.status}`);
  const bidId = bid.data.id;

  const accepted = await api(`/bids/${bidId}/accept`, {
    method: 'PATCH',
    token: customer.token,
  });
  assert(accepted.status === 200, `bid accept failed: ${accepted.status}`);

  const project = await api(`/projects/from-bid/${bidId}`, {
    method: 'POST',
    token: customer.token,
  });
  assert(project.status === 201, `project create failed: ${project.status}`);
  const projectId = project.data.id;

  const milestone = await api(`/projects/${projectId}/milestones`, {
    method: 'POST',
    token: customer.token,
    body: {
      title: 'Milestone 1',
      description: 'Delivery milestone',
      sequence: 1,
      amount: 150,
    },
  });
  assert(milestone.status === 201, `milestone create failed: ${milestone.status}`);
  const milestoneId = milestone.data.id;

  // POST /milestones/:id/deliveries
  const createByFreelancer = await api(`/milestones/${milestoneId}/deliveries`, {
    method: 'POST',
    token: freelancer.token,
    body: {
      submissionUrl: 'https://example.com/delivery-v1.zip',
      note: 'v1',
    },
  });
  add('POST deliveries success', createByFreelancer.status === 201, `${createByFreelancer.status}`);
  const delivery1Id = createByFreelancer.data?.id;

  const createUnauthorized = await api(`/milestones/${milestoneId}/deliveries`, {
    method: 'POST',
    body: {
      submissionUrl: 'https://example.com/no-auth.zip',
      note: 'no auth',
    },
  });
  add('POST deliveries unauthorized', createUnauthorized.status === 401, `${createUnauthorized.status}`);

  const createForbiddenCustomer = await api(`/milestones/${milestoneId}/deliveries`, {
    method: 'POST',
    token: customer.token,
    body: {
      submissionUrl: 'https://example.com/customer.zip',
      note: 'customer cannot upload',
    },
  });
  add('POST deliveries forbidden role', createForbiddenCustomer.status === 403, `${createForbiddenCustomer.status}`);

  const createForbiddenOtherFreelancer = await api(`/milestones/${milestoneId}/deliveries`, {
    method: 'POST',
    token: otherFreelancer.token,
    body: {
      submissionUrl: 'https://example.com/other.zip',
      note: 'other freelancer cannot upload',
    },
  });
  add(
    'POST deliveries forbidden ownership',
    createForbiddenOtherFreelancer.status === 403,
    `${createForbiddenOtherFreelancer.status}`,
  );

  const createNotFound = await api('/milestones/999999/deliveries', {
    method: 'POST',
    token: freelancer.token,
    body: {
      submissionUrl: 'https://example.com/missing.zip',
      note: 'missing milestone',
    },
  });
  add('POST deliveries not found', createNotFound.status === 404, `${createNotFound.status}`);

  // GET /milestones/:id/deliveries
  const listByFreelancer = await api(`/milestones/${milestoneId}/deliveries`, {
    method: 'GET',
    token: freelancer.token,
  });
  add('GET deliveries success', listByFreelancer.status === 200 && Array.isArray(listByFreelancer.data), `${listByFreelancer.status}`);

  const listByArbiter = await api(`/milestones/${milestoneId}/deliveries`, {
    method: 'GET',
    token: arbiter.token,
  });
  add('GET deliveries arbiter access', listByArbiter.status === 200, `${listByArbiter.status}`);

  const listUnauthorized = await api(`/milestones/${milestoneId}/deliveries`, { method: 'GET' });
  add('GET deliveries unauthorized', listUnauthorized.status === 401, `${listUnauthorized.status}`);

  const listNotFound = await api('/milestones/999999/deliveries', {
    method: 'GET',
    token: customer.token,
  });
  add('GET deliveries not found', listNotFound.status === 404, `${listNotFound.status}`);

  // Create v2 for latest-version checks
  const createV2 = await api(`/milestones/${milestoneId}/deliveries`, {
    method: 'POST',
    token: freelancer.token,
    body: {
      submissionUrl: 'https://example.com/delivery-v2.zip',
      note: 'v2 latest',
    },
  });
  add('POST deliveries version 2 success', createV2.status === 201, `${createV2.status}`);
  const delivery2Id = createV2.data?.id;

  // PATCH /deliveries/:id/approve
  const approveOldVersion = await api(`/deliveries/${delivery1Id}/approve`, {
    method: 'PATCH',
    token: customer.token,
  });
  add('PATCH approve old version blocked', approveOldVersion.status === 400, `${approveOldVersion.status}`);

  const approveForbiddenFreelancer = await api(`/deliveries/${delivery2Id}/approve`, {
    method: 'PATCH',
    token: freelancer.token,
  });
  add('PATCH approve forbidden role', approveForbiddenFreelancer.status === 403, `${approveForbiddenFreelancer.status}`);

  const approveUnauthorized = await api(`/deliveries/${delivery2Id}/approve`, {
    method: 'PATCH',
  });
  add('PATCH approve unauthorized', approveUnauthorized.status === 401, `${approveUnauthorized.status}`);

  const approveNotFound = await api('/deliveries/999999/approve', {
    method: 'PATCH',
    token: customer.token,
  });
  add('PATCH approve not found', approveNotFound.status === 404, `${approveNotFound.status}`);

  const approveSuccess = await api(`/deliveries/${delivery2Id}/approve`, {
    method: 'PATCH',
    token: customer.token,
  });
  add(
    'PATCH approve success',
    approveSuccess.status === 200 &&
      approveSuccess.data?.delivery?.status === 'APPROVED' &&
      approveSuccess.data?.payment?.status === 'PENDING',
    `${approveSuccess.status}`,
  );
  const paymentId = approveSuccess.data?.payment?.id;

  const approveAlreadyApproved = await api(`/deliveries/${delivery2Id}/approve`, {
    method: 'PATCH',
    token: customer.token,
  });
  add('PATCH approve invalid state already approved', approveAlreadyApproved.status === 400, `${approveAlreadyApproved.status}`);

  // PATCH /deliveries/:id/revision
  const revisionApprovedInvalidState = await api(`/deliveries/${delivery2Id}/revision`, {
    method: 'PATCH',
    token: customer.token,
    body: { reason: 'Need changes after approval' },
  });
  add('PATCH revision invalid state approved', revisionApprovedInvalidState.status === 400, `${revisionApprovedInvalidState.status}`);

  const revisionForbiddenFreelancer = await api(`/deliveries/${delivery2Id}/revision`, {
    method: 'PATCH',
    token: freelancer.token,
    body: { reason: 'freelancer cannot request revision' },
  });
  add('PATCH revision forbidden role', revisionForbiddenFreelancer.status === 403, `${revisionForbiddenFreelancer.status}`);

  const revisionNotFound = await api('/deliveries/999999/revision', {
    method: 'PATCH',
    token: customer.token,
    body: { reason: 'missing' },
  });
  add('PATCH revision not found', revisionNotFound.status === 404, `${revisionNotFound.status}`);

  // Additional milestone for revision success test
  const milestone2 = await api(`/projects/${projectId}/milestones`, {
    method: 'POST',
    token: customer.token,
    body: {
      title: 'Milestone 2',
      description: 'Revision flow milestone',
      sequence: 2,
      amount: 0,
    },
  });

  if (milestone2.status === 201) {
    const milestone2Id = milestone2.data.id;
    const m2d1 = await api(`/milestones/${milestone2Id}/deliveries`, {
      method: 'POST',
      token: freelancer.token,
      body: { submissionUrl: 'https://example.com/m2-v1.zip', note: 'm2-v1' },
    });
    const m2d2 = await api(`/milestones/${milestone2Id}/deliveries`, {
      method: 'POST',
      token: freelancer.token,
      body: { submissionUrl: 'https://example.com/m2-v2.zip', note: 'm2-v2' },
    });

    const m2RevisionOld = await api(`/deliveries/${m2d1.data?.id}/revision`, {
      method: 'PATCH',
      token: customer.token,
      body: { reason: 'old version revision blocked' },
    });
    add('PATCH revision old version blocked', m2RevisionOld.status === 400, `${m2RevisionOld.status}`);

    const m2RevisionLatest = await api(`/deliveries/${m2d2.data?.id}/revision`, {
      method: 'PATCH',
      token: customer.token,
      body: { reason: 'please revise latest' },
    });
    add(
      'PATCH revision success',
      m2RevisionLatest.status === 200 && m2RevisionLatest.data?.status === 'REVISION_REQUESTED',
      `${m2RevisionLatest.status}`,
    );
  } else {
    add('PATCH revision success', false, `milestone2 create failed: ${milestone2.status}`);
    add('PATCH revision old version blocked', false, 'skipped due to setup failure');
  }

  // POST /payments/:id/release
  const releaseUnauthorized = await api(`/payments/${paymentId}/release`, { method: 'POST' });
  add('POST payment release unauthorized', releaseUnauthorized.status === 401, `${releaseUnauthorized.status}`);

  const releaseForbiddenFreelancer = await api(`/payments/${paymentId}/release`, {
    method: 'POST',
    token: freelancer.token,
  });
  add('POST payment release forbidden role', releaseForbiddenFreelancer.status === 403, `${releaseForbiddenFreelancer.status}`);

  const releaseNotFound = await api('/payments/999999/release', {
    method: 'POST',
    token: customer.token,
  });
  add('POST payment release not found', releaseNotFound.status === 404, `${releaseNotFound.status}`);

  const releaseSuccess = await api(`/payments/${paymentId}/release`, {
    method: 'POST',
    token: customer.token,
  });
  add(
    'POST payment release success',
    releaseSuccess.status === 201 && releaseSuccess.data?.status === 'RELEASED',
    `${releaseSuccess.status}`,
  );

  const releaseInvalidState = await api(`/payments/${paymentId}/release`, {
    method: 'POST',
    token: customer.token,
  });
  add('POST payment release invalid state', releaseInvalidState.status === 400, `${releaseInvalidState.status}`);

  // Create pending payment and test invalid release before approval
  const milestone3 = await api(`/projects/${projectId}/milestones`, {
    method: 'POST',
    token: customer.token,
    body: {
      title: 'Milestone 3',
      description: 'Release-before-approval check',
      sequence: 3,
      amount: 0,
    },
  });
  if (milestone3.status === 201) {
    const milestone3Id = milestone3.data.id;
    const manualPendingPayment = await prisma.payment.create({
      data: {
        milestoneId: milestone3Id,
        amount: 0,
        currency: 'TRY',
      },
    });

    const releaseBeforeApproval = await api(`/payments/${manualPendingPayment.id}/release`, {
      method: 'POST',
      token: customer.token,
    });
    add('POST payment release before approval blocked', releaseBeforeApproval.status === 400, `${releaseBeforeApproval.status}`);
  }
  else {
    add('POST payment release before approval blocked', false, `milestone3 create failed: ${milestone3.status}`);
  }

  // PATCH /payments/:id/refund
  const refundUnauthorized = await api(`/payments/${paymentId}/refund`, {
    method: 'PATCH',
    body: { reason: 'unauthorized' },
  });
  add('PATCH payment refund unauthorized', refundUnauthorized.status === 401, `${refundUnauthorized.status}`);

  const refundForbiddenFreelancer = await api(`/payments/${paymentId}/refund`, {
    method: 'PATCH',
    token: freelancer.token,
    body: { reason: 'freelancer forbidden' },
  });
  add('PATCH payment refund forbidden role', refundForbiddenFreelancer.status === 403, `${refundForbiddenFreelancer.status}`);

  const refundNotFound = await api('/payments/999999/refund', {
    method: 'PATCH',
    token: customer.token,
    body: { reason: 'missing' },
  });
  add('PATCH payment refund not found', refundNotFound.status === 404, `${refundNotFound.status}`);

  const refundSuccess = await api(`/payments/${paymentId}/refund`, {
    method: 'PATCH',
    token: customer.token,
    body: { reason: 'refund after release' },
  });
  add(
    'PATCH payment refund success',
    refundSuccess.status === 200 && refundSuccess.data?.status === 'REFUNDED',
    `${refundSuccess.status}`,
  );

  const refundInvalidState = await api(`/payments/${paymentId}/refund`, {
    method: 'PATCH',
    token: customer.token,
    body: { reason: 'double refund' },
  });
  add('PATCH payment refund invalid state', refundInvalidState.status === 400, `${refundInvalidState.status}`);

  const failed = report.filter((x) => !x.ok);
  for (const item of report) {
    const mark = item.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} - ${item.name}${item.detail ? ` (${item.detail})` : ''}`);
  }

  if (failed.length > 0) {
    throw new Error(`Integration tests failed: ${failed.length} case(s)`);
  }

  console.log(`All integration checks passed: ${report.length} cases`);
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
