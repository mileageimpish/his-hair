/**
 * robots.txt. Preview builds block all crawling. The production rules are a
 * minimal allow-all; HIS-10 adds the sitemap reference and any refinements.
 */
import type { APIRoute } from 'astro';
import { isProduction } from '../lib/deploy-env';

export const GET: APIRoute = () => {
  const body = isProduction()
    ? 'User-agent: *\nAllow: /\n'
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
