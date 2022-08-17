import { execute } from 'hurp-app';
import commands from './commands';

execute({
  name: 'ansible-functions',
  description: 'Ansible functions',
  commands,
});
