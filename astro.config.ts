import { defineConfig } from 'astro/config';
import type { AstroIntegration } from 'astro';
import { defaultLocale, localeCodes } from './src/i18n/locales';
import { getDeployEnv } from './src/lib/deploy-env';

const deployEnv = getDeployEnv();

/** Adds routes that exist only on preview builds (never in production). */
const previewOnlyRoutes = (): AstroIntegration => ({
  name: 'his:preview-only-routes',
  hooks: {
    'astro:config:setup': ({ injectRoute, logger }) => {
      logger.info(`deploy environment: ${deployEnv}`);
      if (deployEnv === 'production') return;
      // Files starting with "_" are ignored in src/pages, so inject it.
      injectRoute({ pattern: '/_parity', entrypoint: './src/parity/index.astro' });
    },
  },
});

export default defineConfig({
  site: 'https://www.hishairclinic.hk',
  output: 'static',
  // WordPress always used a trailing slash; keep every URL identical.
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale,
    locales: localeCodes,
    routing: { prefixDefaultLocale: false },
  },
  integrations: [previewOnlyRoutes()],
});
