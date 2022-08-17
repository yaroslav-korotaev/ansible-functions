import {
  Document,
  YAMLSeq,
  YAMLMap,
  isSeq,
  isMap,
  isScalar,
} from 'yaml';

type AnsibleTask = {
  call: {
    function: string;
    args: Record<string, any>;
  };
  [key: string]: any;
};

type AnsibleFunction = {
  name: string;
  args: string[];
  tasks: AnsibleTask[];
};

type Fn = {
  spec: AnsibleFunction;
  tasksNode: YAMLSeq;
};

type Context = {
  doc: Document;
  fns: Fn[];
  path: string[];
  nest(key: string): Context;
};

const RE_VAR = /\{\{.+?\}\}/g;

function extractFunctions(doc: Document, playNode: YAMLMap): Fn[] {
  const functionsNode = playNode.get('functions', false);
  
  if (!functionsNode) {
    return [];
  }
  
  if (!isSeq(functionsNode)) {
    throw new Error('\'functions\' play keyword must be an array');
  }
  
  playNode.delete('functions');
  
  return functionsNode.items.map(item => {
    if (!isMap(item)) {
      throw new Error('function\'s task must be an object');
    }
    
    const tasksNode = item.get('tasks');
    if (!isSeq(tasksNode)) {
      throw new Error('function should have an array of \'tasks\'');
    }
    
    return {
      spec: item.toJSON(),
      tasksNode,
    };
  });
}

function renameArgs(node: unknown, rename: Record<string, string>): void {
  if (isMap(node)) {
    const keys = node.items.map(item => item.key as string);
    for (const key of keys) {
      const value = node.get(key, true);
      renameArgs(value, rename);
    }
  } else if (isSeq(node)) {
    for (let i = 0; i < node.items.length; i++) {
      const value = node.items[i];
      renameArgs(value, rename);
    }
  } else if (isScalar(node)) {
    if (typeof node.value == 'string') {
      const argNames = Object.keys(rename);
      const replaced = node.value.replace(RE_VAR, match => {
        let result = match;
        for (const argName of argNames) {
          const re = `\W?${argName}\W?`;
          result = result.replace(new RegExp(re, 'g'), rename[argName]);
        }
        
        return result;
      });
      
      node.value = replaced;
    }
  }
}

function applyTask(ctx: Context, taskNode: YAMLMap): void {
  const callNode = taskNode.get('call');
  
  if (callNode && taskNode.has('block')) {
    throw new Error('task couldn\'t be a call and a block at the same time');
  }
  
  if (isMap(callNode)) {
    const call = callNode.toJSON();
    
    const fn = ctx.fns.find(item => item.spec.name == call.function);
    if (!fn) {
      throw new Error(`function '${call.function}' not found`);
    }
    
    taskNode.delete('call');
    taskNode.set('block', fn.tasksNode.clone());
    taskNode.set('vars', new YAMLMap());
    
    const argsNode = callNode.get('args') as YAMLMap;
    const argNames = argsNode.items.map(item => item.key as string);
    const argsRename: Record<string, string> = {};
    for (const argName of argNames) {
      argsRename[argName] = [argName, ...ctx.path].join('_');
    }
    
    renameArgs(taskNode, argsRename);
    
    const taskVarsNode = taskNode.get('vars', false) as YAMLMap;
    
    for (const argName of argNames) {
      taskVarsNode.set(argsRename[argName], argsNode.get(argName, false));
    }
  }
  
  const blockNode = taskNode.get('block', false);
  
  if (isSeq(blockNode)) {
    applyTasks(ctx.nest('block'), blockNode);
  }
}

function applyTasks(ctx: Context, tasksNode: YAMLSeq): void {
  for (let i = 0; i < tasksNode.items.length; i++) {
    const taskNode = tasksNode.items[i];
    if (!isMap(taskNode)) {
      throw new Error('play\'s or block task must be an object');
    }
    
    applyTask(ctx.nest('' + i), taskNode);
  }
}

function applyPlay(doc: Document, playNode: YAMLMap): void {
  const fns = extractFunctions(doc, playNode);
  
  const tasksNode = playNode.get('tasks', false);
  
  if (!tasksNode) {
    return;
  }
  
  if (!isSeq(tasksNode)) {
    throw new Error('\'tasks\' play keyword must be an array');
  }
  
  const ctx: Context = {
    doc,
    fns,
    path: [],
    nest(key) {
      return {
        doc: this.doc,
        fns: this.fns,
        path: [...this.path, key],
        nest: this.nest,
      };
    },
  };
  
  applyTasks(ctx, tasksNode);
}

export function applyPlaybook(playbook: Document<YAMLSeq>): void {
  const playbookNode = playbook.contents!;
  
  for (const playNode of playbookNode.items) {
    if (!isMap(playNode)) {
      throw new Error('playbook\'s play must be an object');
    }
    
    applyPlay(playbook, playNode);
  }
}
