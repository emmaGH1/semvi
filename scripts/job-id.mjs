import {createHash} from 'node:crypto';
const reference=process.argv[2];
if(!reference){console.error('Usage: node scripts/job-id.mjs STABLE_BUSINESS_REFERENCE');process.exit(1);}
console.log(createHash('sha256').update('semvi.job.v1\0').update(reference,'utf8').digest('hex'));
