import { context } from './hoist';
import render from './render';

export default context.root({
  children: [
    render,
  ],
});
