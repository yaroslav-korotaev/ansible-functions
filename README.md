# ansible-functions

Ansible functions.

## Install

```
npm i -g ansible-functions
```

## Usage

```
ansible-functions render playbook.src.yml playbook.yml
```

It will transform this:

```yaml
- hosts: localhost
  functions:
    - name: hello
      tasks:
        - debug:
            msg: "{{ message }}"
  tasks:
    - call:
        function: hello
        args:
          message: hola
```

To that:

```yaml
- hosts: localhost
  tasks:
    - block:
        - debug:
            msg: "{{ message_0 }}"
      vars:
        message_0: hola
```

Nested calls and blocks are supported, but recursive calls doesn't.
