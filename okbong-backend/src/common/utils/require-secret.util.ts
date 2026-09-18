import { ConfigService } from '@nestjs/config';

/**
 * Reads a secret that must be configured. Falling back to a hardcoded default
 * would leave tokens forgeable with a value that is public in the repository,
 * so a missing secret is a startup error instead.
 *
 * Development still gets working values from `.env` (see `.env.example`);
 * only an actually-unset variable fails.
 */
export function requireSecret(configService: ConfigService, key: string): string {
  const value = configService.get<string>(key);

  if (!value || !value.trim()) {
    throw new Error(
      `${key} is not set. Provide it in the environment (see .env.example); ` +
        'refusing to start with a hardcoded fallback secret.',
    );
  }

  return value;
}