import fs from 'fs/promises';
import {
  YAMLSeq,
  parseDocument,
} from 'yaml';
import { applyPlaybook } from './apply-playbook';

export async function render(from: string, to: string): Promise<void> {
  const source = await fs.readFile(from, { encoding: 'utf8' });
  const playbook = parseDocument<YAMLSeq.Parsed>(source);
  
  applyPlaybook(playbook);
  
  const dest = playbook.toString();
  await fs.writeFile(to, dest, { encoding: 'utf8' });
}
