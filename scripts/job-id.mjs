import {jobId} from '../packages/semvi/lib/ootle.js';

const reference = process.argv[2];
if (!reference) {
  console.error('Usage: node scripts/job-id.mjs STABLE_BUSINESS_REFERENCE');
  process.exit(1);
}
console.log(await jobId(reference));
