/**
 * Decides whether this build is the production build or a preview build.
 *
 * Production builds are indexable and leave out preview-only routes such as
 * /_parity/. Everything else (branch previews, PR previews, local builds) is a
 * preview: it is noindexed and includes the preview-only routes. Defaulting to
 * "preview" means a misconfigured build can never be indexed by accident.
 *
 * Inputs (all build-time environment variables, see .env.example):
 * - SITE_ENV: "production" or "preview". Overrides the detection below.
 * - CF_PAGES_BRANCH: set by Cloudflare Pages to the branch being built.
 * - PRODUCTION_BRANCH: the branch Cloudflare Pages deploys to production
 *   (default "main").
 */
export type DeployEnv = 'production' | 'preview';

type Env = Record<string, string | undefined>;

export function getDeployEnv(env: Env = process.env): DeployEnv {
  const override = env.SITE_ENV?.trim();
  if (override) {
    if (override === 'production' || override === 'preview') return override;
    throw new Error(`SITE_ENV must be "production" or "preview", got "${override}"`);
  }
  const branch = env.CF_PAGES_BRANCH?.trim();
  const productionBranch = env.PRODUCTION_BRANCH?.trim() || 'main';
  return branch !== undefined && branch === productionBranch ? 'production' : 'preview';
}

export const isProduction = (env?: Env): boolean => getDeployEnv(env) === 'production';
