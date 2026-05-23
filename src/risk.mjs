import { matchesAny } from './matcher.mjs';

function bump(current, next) {
  const order = ['L0', 'L1', 'L2', 'L3'];
  return order.indexOf(next) > order.indexOf(current) ? next : current;
}

export function classifyFiles(files, config) {
  let riskLevel = 'L0';
  const areas = new Set();
  const reasons = [];

  for (const file of files) {
    if (matchesAny(file, config.redZone)) {
      riskLevel = bump(riskLevel, file.includes('migrations') || file.includes('.env') || file.includes('deploy') || file.includes('infra') ? 'L3' : 'L2');
      areas.add('red-zone'); reasons.push(`${file} matches red zone policy`);
    } else if (matchesAny(file, config.yellowZone)) {
      riskLevel = bump(riskLevel, 'L1');
      areas.add('yellow-zone'); reasons.push(`${file} matches yellow zone policy`);
    }
    if (/auth|security|permission|payment|webhook|session|token/i.test(file)) { riskLevel = bump(riskLevel, 'L2'); areas.add('security'); }
    if (/migration|schema\.prisma|db\/|database/i.test(file)) { riskLevel = bump(riskLevel, 'L2'); areas.add('database'); }
    if (/\.github\/workflows|deploy|infra|Dockerfile|compose\.ya?ml/i.test(file)) { riskLevel = bump(riskLevel, 'L2'); areas.add('release'); }
    if (/src\/|app\/|server\/|lib\//.test(file)) { riskLevel = bump(riskLevel, 'L1'); areas.add('code'); }
    if (/AGENTS\.md|CLAUDE\.md|\.claude|\.codex|\.agents/.test(file)) { riskLevel = bump(riskLevel, 'L2'); areas.add('ai-workflow'); }
  }

  const requiredGates = new Set();
  if (['L1', 'L2', 'L3'].includes(riskLevel)) requiredGates.add('requirement');
  if (['L1', 'L2', 'L3'].includes(riskLevel)) requiredGates.add('test');
  if (['L2', 'L3'].includes(riskLevel)) requiredGates.add('design');
  if (areas.has('security')) requiredGates.add('security');
  if (areas.has('database') || areas.has('release') || riskLevel === 'L3') requiredGates.add('release');
  if (riskLevel === 'L3') requiredGates.add('approval');

  return { riskLevel, changedAreas: [...areas], reasons, requiredGates: [...requiredGates] };
}
