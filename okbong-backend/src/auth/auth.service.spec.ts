import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';

describe('AuthService — 2FA integration', () => {
  let authService: AuthService;
  let twoFactorService: TwoFactorService;

  const findOne = vi.fn();
  const saveTempTwoFactorSecret = vi.fn();
  const enableTwoFactor = vi.fn();
  const disableTwoFactor = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    twoFactorService = new TwoFactorService();
    authService = new AuthService(
      { findOne, saveTempTwoFactorSecret, enableTwoFactor, disableTwoFactor } as never,
      { sign: vi.fn().mockReturnValue('jwt-token') } as never,
      { get: vi.fn().mockReturnValue('1h') } as never,
      twoFactorService,
    );
  });

  it('setup2FA stores the temporary secret on the user', async () => {
    const result = await authService.setup2FA('u1', 'user@test.io');

    expect(result.otpauthUrl).toContain('otpauth://totp');
    expect(saveTempTwoFactorSecret).toHaveBeenCalledWith('u1', result.secret);
  });

  it('enable2FA verifies the token against the stored secret and enables 2FA', async () => {
    const secret = twoFactorService.generateSecret();
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: secret, twoFactorEnabled: false });
    const token = twoFactorService.generateToken(secret);

    const result = await authService.enable2FA('u1', token, secret);

    expect(result.message).toContain('thành công');
    expect(enableTwoFactor).toHaveBeenCalledWith('u1', secret);
  });

  it('enable2FA rejects an invalid token', async () => {
    const secret = twoFactorService.generateSecret();
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: secret, twoFactorEnabled: false });

    await expect(authService.enable2FA('u1', '000000', secret)).rejects.toThrow(
      BadRequestException,
    );
    expect(enableTwoFactor).not.toHaveBeenCalled();
  });

  it('enable2FA rejects when no secret was ever set up', async () => {
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: null, twoFactorEnabled: false });

    await expect(authService.enable2FA('u1', '123456')).rejects.toThrow(BadRequestException);
  });

  it('verify2FA returns verified for a valid TOTP', async () => {
    const secret = twoFactorService.generateSecret();
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: secret, twoFactorEnabled: true });
    const token = twoFactorService.generateToken(secret);

    await expect(authService.verify2FA('u1', token)).resolves.toEqual({ verified: true });
  });

  it('verify2FA rejects when 2FA is not enabled', async () => {
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: null, twoFactorEnabled: false });

    await expect(authService.verify2FA('u1', '123456')).rejects.toThrow(BadRequestException);
  });

  it('disable2FA clears the secret after a valid token', async () => {
    const secret = twoFactorService.generateSecret();
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: secret, twoFactorEnabled: true });
    const token = twoFactorService.generateToken(secret);

    await expect(authService.disable2FA('u1', token)).resolves.toEqual({
      message: '2FA đã được tắt thành công',
    });
    expect(disableTwoFactor).toHaveBeenCalledWith('u1');
  });
});