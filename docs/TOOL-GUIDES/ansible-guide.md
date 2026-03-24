# Ansible Guide for TaskFlow

Automation and configuration management with Ansible.

## Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install ansible -y

# Verify
ansible --version
```

## Quick Start

```bash
cd configuration

# Check inventory
ansible-inventory -i inventory --list

# Test connectivity
ansible all -i inventory -m ping

# Run playbook
ansible-playbook -i inventory playbooks/site.yml

# Run with sudo
ansible-playbook -i inventory playbooks/site.yml --become

# Dry run
ansible-playbook -i inventory playbooks/site.yml --check

# Run specific tasks
ansible-playbook -i inventory playbooks/deploy-app.yml --tags "backend"
```

## TaskFlow Playbooks

### Full Deployment
```bash
ansible-playbook -i inventory playbooks/site.yml
```

### Deploy Application Only
```bash
ansible-playbook -i inventory playbooks/deploy-app.yml
```

### Update System
```bash
ansible-playbook -i inventory playbooks/update-system.yml
```

### Backup Database
```bash
ansible-playbook -i inventory playbooks/backup.yml
```

### Scale Up/Down
```bash
ansible-playbook -i inventory playbooks/scale-up.yml
ansible-playbook -i inventory playbooks/scale-down.yml
```

## Common Commands

```bash
# List hosts
ansible all -i inventory --list-hosts

# Run ad-hoc command
ansible all -i inventory -m shell -a "uptime"

# Check playbook syntax
ansible-playbook playbook.yml --syntax-check

# View available tags
ansible-playbook playbook.yml --list-tags

# Run specific hosts
ansible-playbook -i inventory playbook.yml --limit "webservers"
```

## Variables

```bash
# Pass extra variables
ansible-playbook playbook.yml -e "version=2.0.0"

# Use vault for secrets
ansible-vault create secrets.yml
ansible-playbook playbook.yml --ask-vault-pass
```

## Best Practices

1. Use roles for organization
2. Keep playbooks idempotent
3. Use ansible-vault for secrets
4. Test with `--check` first
5. Use tags for selective execution
6. Document variables in defaults/
7. Keep tasks small and focused

## Resources
- [Ansible Documentation](https://docs.ansible.com/)
- [Best Practices](https://docs.ansible.com/ansible/latest/user_guide/playbooks_best_practices.html)
