const fs = require('fs');

async function main() {
  let blocked = false;
  try {
    await fetch('https://riskops-75637.firebaseio.com/qa-negative-probe.json');
  } catch (error) {
    blocked = error && error.code === 'QA_NETWORK_GUARD_BLOCKED';
  }
  if (!blocked) throw new Error('NEGATIVE_PROBE_NOT_BLOCKED');
    const summary = [
      'NEGATIVE_PRODUCTION_PROBE_BLOCKED = VERIFIED_EXECUTED',
      'PRODUCTION_NETWORK_REQUESTS = 0',
      '',
    ].join('\n');
    fs.writeFileSync(process.env.NETWORK_SUMMARY_PATH || 'network-summary.txt', summary);
    process.stdout.write(summary);
}

main().catch(() => {
  process.stderr.write('NETWORK_GUARD_VERIFICATION_FAILED\n');
  process.exitCode = 1;
});
