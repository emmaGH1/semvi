#!/usr/bin/env node
import {installHelpers} from '../lib/helpers.js';

const [command, ...flags] = process.argv.slice(2);
const usage = 'Usage: semvi-helpers install [--allow-unpinned]';
if (command === '--help' && flags.length === 0) {
  console.log(usage);
} else if (command !== 'install' || flags.length > 1 || flags.some(flag => flag !== '--allow-unpinned')) {
  console.error(usage);
  process.exitCode = 1;
} else {
  try {
    const dir = await installHelpers({allowUnpinned: flags.length === 1});
    console.log(`Semvi helpers installed in ${dir}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
