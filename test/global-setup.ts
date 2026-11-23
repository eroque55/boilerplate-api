import { execSync } from 'node:child_process';

import type { TestProject } from 'vitest/node';

export default (project: TestProject) => {
  execSync('yarn prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: project.config.env.DATABASE_URL,
    },
  });
};
