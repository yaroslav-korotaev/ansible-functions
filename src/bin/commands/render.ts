import { context } from './hoist';
import { render } from '../../';

export default context.command({
  name: 'render',
  default: true,
  usage: '<from> <to>',
  description: 'Render ansible playbook with functions expanded',
  handler: async (ctx, args) => {
    const [from, to] = args._;
    
    if (!from) {
      throw new Error('no \'from\' file specified');
    }
    
    if (!to) {
      throw new Error('no \'to\' file specified');
    }
    
    await render(from, to);
  },
});
