// Content for the "DevOps Tour" pages (src/pages/TourOverview.jsx, TourPage.jsx).
//
// This is static, hand-written reference material - no live data, no fetches
// to localhost or anywhere else. It's meant to be read, not executed by the
// page itself. Commands are plain text for the user to copy and run
// themselves, sourced from docs/TOOL-GUIDES/*.md in this repo (the full,
// longer versions of each guide live there).
//
// Deliberately excluded: any real secret, key, or generated value. Where a
// command needs one (e.g. the metrics key), it uses an obvious placeholder.
import { Package, GitBranch, Hexagon, Stack, Robot, ChartLineUp } from '@phosphor-icons/react'

export const TOUR_PAGES = [
  {
    slug: 'docker',
    title: 'Docker',
    icon: Package,
    tagline: 'Container runtime - how TaskFlow packages and runs its services locally.',
    guidePath: 'docs/TOOL-GUIDES/docker-guide.md',
    sections: [
      {
        heading: 'Where this fits in TaskFlow',
        body: "The repo's docker-compose.yml spins up the backend, frontend, Postgres, Prometheus, and Grafana together for local development. Render (production) doesn't use these Docker images directly - it builds the backend and frontend separately from source - so this is purely a local/learning setup.",
      },
      {
        heading: 'Install Docker',
        body: 'Not installed by default - grab it for your OS from the official docs:',
        links: [
          { label: 'Windows', url: 'https://docs.docker.com/desktop/setup/install/windows-install/' },
          { label: 'Mac', url: 'https://docs.docker.com/desktop/setup/install/mac-install/' },
          { label: 'Linux', url: 'https://docs.docker.com/engine/install/' },
        ],
      },
      {
        heading: 'Get everything running',
        body: 'Run from the repository root (the folder with docker-compose.yml in it).',
        commands: [
          {
            label: 'Recommended: guided setup (checks Docker is running, creates .env files, seeds demo data)',
            code: './scripts/setup.sh',
          },
          {
            label: 'Manual equivalent',
            code: 'docker-compose up -d',
          },
          {
            label: 'Check what’s running',
            code: 'docker-compose ps',
          },
          {
            label: 'Follow logs for everything (or one service)',
            code: 'docker-compose logs -f\ndocker-compose logs -f backend',
          },
          {
            label: 'Stop everything',
            code: 'docker-compose down',
          },
        ],
      },
      {
        heading: 'Useful day-to-day commands',
        commands: [
          {
            code: 'docker ps                     # running containers\ndocker ps -a                  # all containers, including stopped\ndocker exec -it backend sh    # shell into a running container\ndocker stats                  # live CPU/memory per container\ndocker logs -f backend        # follow one container’s logs',
          },
        ],
      },
      {
        heading: 'Rebuilding after a code change',
        body: 'The backend image deliberately has npm removed at build time (hardening step, cuts Trivy findings), and only ever installs production dependencies - so anything needing npm or a dev dependency (like running tests) has to happen on your host, not inside the container.',
        commands: [
          {
            code: 'docker-compose up --build\ndocker-compose exec backend node src/database/seed.js   # seed demo data\ndocker-compose exec postgres psql -U taskflow_user -d taskflow',
          },
          {
            label: 'Run tests (on your host, not in the container)',
            code: 'cd app/backend && npm test\ncd app/frontend && npm test',
          },
        ],
      },
      {
        heading: 'Cleaning up disk space',
        commands: [
          {
            code: 'docker system prune -a --volumes',
          },
        ],
      },
      {
        heading: 'Troubleshooting',
        body: 'If ./scripts/setup.sh or docker-compose up fails partway through anything, run the stop command below before retrying - a half-started stack is what causes most of the errors below in the first place. Then the three real ones hit while building this project, in order of how often they show up:',
        commands: [
          {
            label: 'Something failed partway through',
            code: 'docker-compose down',
          },
          {
            label: 'Docker isn’t running (connection/socket error)',
            code: '# Linux:  sudo systemctl start docker\n# Docker Desktop: open the app, wait for it to say "running"',
          },
          {
            label: '"port is already allocated"',
            code: '# find what has it:\nsudo lsof -i :8080\n# or just use a different port - add to .env:\nADMINER_PORT=8081',
          },
          {
            label: '"Network ... needs to be recreated"',
            code: '# docker-compose down doesn’t always fully clear the old network - if\n# the error repeats after that, force it:\ndocker rm -f taskflow-postgres taskflow-redis taskflow-backend taskflow-frontend taskflow-prometheus taskflow-grafana taskflow-adminer\ndocker network rm 001taskflow_taskflow-network\ndocker-compose up -d',
          },
        ],
      },
    ],
    security: [
      'Never commit a real .env file - only .env.example with placeholder values belongs in git (already enforced by .gitignore in this repo).',
      'The docker-compose.yml Postgres/Grafana passwords (taskflow_password, admin/admin) are local-dev defaults only. Don’t reuse them anywhere reachable outside your own machine.',
      'Run docker system prune with care on a shared machine - it deletes unused images/volumes for every project, not just this one.',
    ],
  },
  {
    slug: 'git',
    title: 'Git & GitHub',
    icon: GitBranch,
    tagline: 'Branching, commits, and the PR/CI flow this repo actually uses.',
    guidePath: 'docs/TOOL-GUIDES/git-guide.md',
    sections: [
      {
        heading: 'Where this fits in TaskFlow',
        body: 'Every push to main triggers CI (lint, tests) and, on Render, an auto-deploy. Feature branches let you break things safely before they reach main.',
      },
      {
        heading: 'Install Git',
        links: [{ label: 'All platforms', url: 'https://git-scm.com/install/' }],
      },
      {
        heading: 'Everyday workflow',
        commands: [
          {
            code: 'git checkout -b feature/my-change\ngit add .\ngit commit -m "feat: describe the change"\ngit push origin feature/my-change\n# then open a Pull Request on GitHub',
          },
        ],
      },
      {
        heading: 'Commit message convention',
        body: 'This repo follows Conventional Commits - the prefix says what kind of change it is at a glance.',
        commands: [
          {
            code: 'git commit -m "feat: add user authentication"\ngit commit -m "fix: resolve database connection issue"\ngit commit -m "docs: update README with deployment steps"',
          },
        ],
      },
      {
        heading: 'Commands worth knowing',
        commands: [
          {
            code: 'git status                     # what’s changed\ngit log --oneline --graph      # visual history\ngit reset --soft HEAD~1        # undo last commit, keep the changes\ngit checkout -- <file>         # discard changes to one file\ngit pull origin main           # bring your branch up to date',
          },
        ],
      },
    ],
    security: [
      'Never git add a real .env, credentials file, or downloaded key - check git status before committing if you’re not sure what’s staged.',
      'If a secret does get committed, rotating it (generating a new one) matters more than trying to scrub git history - assume anything ever pushed is permanently exposed.',
      'This repo’s CI runs on every push, including forks’ pull requests - never rely on a GitHub Actions secret being safe from a malicious PR without checking the workflow’s permissions first.',
    ],
  },
  {
    slug: 'kubernetes',
    title: 'Kubernetes',
    icon: Hexagon,
    tagline: 'Running TaskFlow on a cluster instead of a single Docker host.',
    guidePath: 'docs/TOOL-GUIDES/kubernetes-guide.md',
    sections: [
      {
        heading: 'Where this fits in TaskFlow',
        body: 'Optional, more advanced path than Docker Compose - manifests live under kubernetes/ for a local Minikube cluster, a small K3s cluster (e.g. on Oracle Cloud’s free tier), or a hybrid setup. Not used by the Render deployment. Commands below reference that folder, so run them from the repository root.',
      },
      {
        heading: 'Install kubectl and Minikube',
        links: [
          { label: 'kubectl', url: 'https://kubernetes.io/docs/tasks/tools/' },
          { label: 'Minikube', url: 'https://minikube.sigs.k8s.io/docs/start/' },
        ],
      },
      {
        heading: 'Deploy locally with Minikube',
        commands: [
          {
            code: 'minikube start --cpus=4 --memory=8192\nkubectl apply -f kubernetes/local-minikube/\nkubectl get pods -n taskflow -w',
          },
        ],
      },
      {
        heading: 'Everyday commands',
        commands: [
          {
            code: 'kubectl get pods -n taskflow\nkubectl logs -f <pod-name> -n taskflow\nkubectl describe pod <pod-name> -n taskflow\nkubectl exec -it <pod-name> -n taskflow -- sh',
          },
        ],
      },
      {
        heading: 'Scaling and rollouts',
        commands: [
          {
            code: 'kubectl scale deployment backend --replicas=5 -n taskflow\nkubectl rollout status deployment/backend -n taskflow\nkubectl rollout undo deployment/backend -n taskflow',
          },
        ],
      },
      {
        heading: 'Reach a service from your machine',
        commands: [
          {
            code: 'kubectl port-forward svc/backend-service 3000:3000 -n taskflow',
          },
        ],
      },
      {
        heading: 'When something’s wrong',
        commands: [
          {
            code: "kubectl get events -n taskflow --sort-by='.lastTimestamp'\nkubectl logs -l app=backend -n taskflow --tail=100\nkubectl top pods -n taskflow",
          },
        ],
      },
    ],
    security: [
      'kubectl create secret generic ... --from-literal=key=value puts the value in cluster state, not in your shell history if you use --from-file instead - prefer that for anything sensitive.',
      'kubectl get secrets shows names, not values, by default - but describe/get -o yaml on a Secret reveals base64-encoded (not encrypted) contents to anyone with access to the namespace.',
      'Namespace-scope your RBAC (Role/RoleBinding) rather than granting cluster-wide access, especially on a shared or cloud cluster.',
    ],
  },
  {
    slug: 'terraform',
    title: 'Terraform',
    icon: Stack,
    tagline: 'Infrastructure as code for provisioning the servers TaskFlow runs on.',
    guidePath: 'docs/TOOL-GUIDES/terraform-guide.md',
    sections: [
      {
        heading: 'Where this fits in TaskFlow',
        body: 'Used for the more advanced "real infrastructure" learning paths - three independent variants live under infrastructure/: oracle-cloud (free tier), local-vms, and hybrid. Not part of the Render deployment. Commands below are shown for oracle-cloud - swap the directory for whichever variant you’re using.',
      },
      {
        heading: 'Install Terraform',
        links: [{ label: 'All platforms', url: 'https://developer.hashicorp.com/terraform/install' }],
      },
      {
        heading: 'First-time setup',
        commands: [
          {
            code: 'cd infrastructure/oracle-cloud\ncp terraform.tfvars.example terraform.tfvars\n# edit terraform.tfvars with your own credentials - never commit this file\nterraform init\nterraform plan',
          },
        ],
      },
      {
        heading: 'Standard workflow',
        commands: [
          {
            code: 'cd infrastructure/oracle-cloud\nterraform init\nterraform plan\nterraform apply',
          },
        ],
      },
      {
        heading: 'Inspecting and managing state',
        commands: [
          {
            code: 'cd infrastructure/oracle-cloud\nterraform show\nterraform state list\nterraform state show <resource>\nterraform output',
          },
        ],
      },
      {
        heading: 'Tearing it down',
        commands: [
          {
            code: 'cd infrastructure/oracle-cloud\nterraform destroy',
          },
        ],
      },
    ],
    security: [
      '.tfvars files hold real cloud credentials - they’re gitignored for a reason, never force-add one.',
      'terraform.tfstate can contain sensitive values in plain text (e.g. generated passwords) - keep it out of git and out of any public bucket; use remote state with access controls for anything beyond solo learning.',
      'Always run terraform plan and actually read the diff before apply - it shows exactly what will be created, changed, or destroyed.',
    ],
  },
  {
    slug: 'ansible',
    title: 'Ansible',
    icon: Robot,
    tagline: 'Configuration management - scripting server setup instead of doing it by hand.',
    guidePath: 'docs/TOOL-GUIDES/ansible-guide.md',
    sections: [
      {
        heading: 'Where this fits in TaskFlow',
        body: 'Pairs with the Terraform path: Terraform provisions the server, Ansible playbooks (under configuration/) then install and configure everything on it - Docker, the app, monitoring. Optional and not used by the Render deployment. Commands below are relative to configuration/, hence the cd.',
      },
      {
        heading: 'Install Ansible',
        links: [
          {
            label: 'All platforms',
            url: 'https://docs.ansible.com/projects/ansible/latest/installation_guide/index.html',
          },
        ],
      },
      {
        heading: 'Before running anything',
        commands: [
          {
            code: 'cd configuration\nansible-inventory -i inventory --list\nansible all -i inventory -m ping',
          },
        ],
      },
      {
        heading: 'Run a playbook',
        commands: [
          {
            code: 'cd configuration\nansible-playbook -i inventory playbooks/site.yml\n\n# see what would change without touching anything\nansible-playbook -i inventory playbooks/site.yml --check',
          },
        ],
      },
      {
        heading: 'Common playbooks in this repo',
        commands: [
          {
            code: 'cd configuration\nansible-playbook -i inventory playbooks/deploy-app.yml   # app only\nansible-playbook -i inventory playbooks/update-system.yml\nansible-playbook -i inventory playbooks/backup.yml',
          },
        ],
      },
    ],
    security: [
      'Always run with --check first on anything you didn’t write yourself - it’s a dry run that shows what would change.',
      'Use ansible-vault for any secret a playbook needs (ansible-vault create secrets.yml) instead of writing it into a plain YAML var file.',
      'ansible-playbook ... --ask-vault-pass prompts interactively - avoid storing the vault password in a script or committing a .vault_pass file.',
    ],
  },
  {
    slug: 'monitoring',
    title: 'Monitoring (Prometheus & Grafana)',
    icon: ChartLineUp,
    tagline: 'Where TaskFlow’s metrics come from and how to look at them.',
    guidePath: 'docs/TOOL-GUIDES/prometheus-grafana-guide.md',
    quickAccess: [
      { label: 'Prometheus', value: 'http://localhost:9090 (local Docker Compose only)' },
      { label: 'Grafana', value: 'http://localhost:3001 - default admin/admin, change it' },
      { label: 'Backend metrics endpoint', value: '/metrics on the backend' },
    ],
    sections: [
      {
        heading: 'Important: this is a local-only stack right now',
        body: "Grafana and Prometheus are defined in docker-compose.yml and only start when you run docker-compose up locally. They are not part of the Render production deployment - there's no live, public Grafana or Prometheus for this app to link to, and that's intentional (see the security note below).",
      },
      {
        heading: 'Start it locally',
        body: 'Same rule as the Docker page: docker-compose up has to run from the repository root, not from monitoring/ or anywhere inside app/.',
        commands: [
          {
            code: './scripts/setup.sh   # or: docker-compose up -d\n# Prometheus: http://localhost:9090\n# Grafana:    http://localhost:3001 (admin/admin on first login)',
          },
        ],
      },
      {
        heading: 'What the backend exposes',
        body: 'The backend publishes Prometheus-format metrics. Once deployed to Render, that endpoint requires a shared-secret header (added after we audited this - it used to be wide open):',
        commands: [
          {
            label: 'Local (no key needed by default)',
            code: 'curl http://localhost:3000/metrics',
          },
          {
            label: 'Render production (needs the real key from your Render dashboard)',
            code: 'curl -H "X-Metrics-Key: <your-metrics-key>" https://<your-backend>.onrender.com/metrics',
          },
        ],
      },
      {
        heading: 'PromQL you’ll actually use',
        commands: [
          {
            label: 'Requests per second, last 5 minutes',
            code: 'rate(http_requests_total[5m])',
          },
          {
            label: 'Error rate (5xx) as a percentage',
            code: '(sum(rate(http_requests_total{status_code=~"5.."}[5m])) /\n sum(rate(http_requests_total[5m]))) * 100',
          },
          {
            label: 'P95 response time',
            code: 'histogram_quantile(0.95,\n  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)\n)',
          },
          {
            label: 'Memory usage in MB',
            code: 'process_resident_memory_bytes / 1024 / 1024',
          },
        ],
      },
      {
        heading: 'Building your first Grafana panel',
        body: 'Add visualization → pick Prometheus as the data source → switch the query editor to Code mode → paste a PromQL query above → Apply. Start with request rate or memory usage; both update live once traffic hits the backend.',
      },
    ],
    security: [
      "Grafana's default admin/admin login is public knowledge - change it immediately if you ever expose this stack beyond localhost, even briefly.",
      'The backend’s /metrics endpoint reveals request counts, auth attempt success/failure ratios, and DB pool stats - useful for you, useful for an attacker too. That’s why it’s locked behind a key in production rather than being linked from the app for visitors.',
      'If you do deploy Prometheus/Grafana somewhere reachable from the internet, put them behind their own authentication (not just Grafana’s login) and never reuse the docker-compose.yml default credentials.',
    ],
  },
]

export const getTourPage = slug => TOUR_PAGES.find(page => page.slug === slug)

// Every machine is different (OS, Docker version, what else is already
// running on a given port) - static docs can't cover every combination.
// This is a reusable template for asking any AI assistant for help, built
// so it actually gives useful context instead of just the raw error.
export const DEBUG_PROMPT_TEMPLATE = `I'm following the DevOps Tour in github.com/raimonvibe/TaskFlow.

OS: [Windows / Mac / Linux - version]
Page: [which DevOps Tour page you're on]
Command I ran: [paste it here]
Error I got: [paste it here]

(I've removed any passwords, tokens, or keys from the error above)

What's wrong, and how do I fix it?`
