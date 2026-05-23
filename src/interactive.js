import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export async function confirmConfiguration(scan, config, { yes = false } = {}) {
  if (yes) return config;

  const rl = readline.createInterface({ input, output });
  try {
    console.log('\n# Confirmation Required');
    console.log(`Recommended target: ${config.target}`);
    console.log(`Risk profile: ${scan.riskProfile.level}`);
    console.log('Press Enter to accept each default.');

    const target = await ask(rl, `Target format [${config.target}]`, config.target);
    const stage = await ask(rl, `Project stage [${config.stage}]`, config.stage);
    const aiAutonomy = await ask(rl, `AI autonomy low/medium/high [${config.aiAutonomy}]`, config.aiAutonomy);
    const testGate = await ask(rl, `Test gate light/normal/strict [${config.testGate}]`, config.testGate);
    const securityGate = await ask(rl, `Security gate light/normal/strict [${config.securityGate}]`, config.securityGate);
    const releaseGate = await ask(rl, `Release gate none/light/strict [${config.releaseGate}]`, config.releaseGate);
    const proceed = await ask(rl, 'Generate files? yes/no [yes]', 'yes');

    if (proceed.toLowerCase() !== 'yes' && proceed.toLowerCase() !== 'y') {
      return { ...config, cancelled: true };
    }
    return { ...config, target, stage, aiAutonomy, testGate, securityGate, releaseGate };
  } finally {
    rl.close();
  }
}

async function ask(rl, prompt, fallback) {
  const answer = await rl.question(`${prompt}: `);
  return answer.trim() || fallback;
}
