import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService, TwoFaChallengeResult } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { OTPSessionService } from './otp-session.service';

describe('AuthService — 2FA integration', () => {
  let authService: AuthService;
  let twoFactorService: TwoFactorService;
  let otpSessionService: OTPSessionService;

  // UserService mock methods
  const findOne = vi.fn();
  const findByEmailWithPassword = vi.fn();
  const saveTempTwoFactorSecret = vi.fn();
  const enableTwoFactor = vi.fn();
  const disableTwoFactor = vi.fn();
  const findByEmailWithPasswordNoPassword = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    twoFactorService = new TwoFactorService();
    otpSessionService = new OTPSessionService();

    authService = new AuthService(
      {
        findOne,
        findByEmailWithPassword: findByEmailWithPassword,
        saveTempTwoFactorSecret,
        enableTwoFactor,
        disableTwoFactor,
      } as never,
      { sign: vi.fn().mockReturnValue('jwt-token') } as never,
      { get: vi.fn().mockReturnValue('1h') } as never,
      twoFactorService,
      otpSessionService,
    );
  });

  // ─── setup2FA ──────────────────────────────────────────────────────────────

  it('setup2FA stores the temporary secret on the user', async () => {
    findByEmailWithPassword.mockResolvedValue({
      id: 'u1',
      email: 'user@test.io',
      twoFactorSecret: null,
      twoFactorEnabled: false,
      comparePassword: vi.fn().mockResolvedValue(true),
    });
    const result = await authService.setup2FA('u1', 'user@test.io');

    expect(result.otpauthUrl).toContain('otpauth://totp');
    expect(result.secret.length).toBeGreaterThan(0);
    expect(saveTempTwoFactorSecret).toHaveBeenCalledWith('u1', result.secret);
  });

  // ─── enable2FA ─────────────────────────────────────────────────────────────

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

  it('enable2FA rejects if 2FA already enabled', async () => {
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: 'abc', twoFactorEnabled: true });

    await expect(authService.enable2FA('u1', '123456')).rejects.toThrow(BadRequestException);
    expect(enableTwoFactor).not.toHaveBeenCalled();
  });

  // ─── verify2FA (session-based, new flow) ──────────────────────────────────

  it('verify2FA returns tokens for a valid TOTP', async () => {
    const secret = twoFactorService.generateSecret();
    const sessionId = otpSessionService.createSession('u1', 'user@test.io');
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: secret, twoFactorEnabled: true, email: 'user@test.io', role: 'USER' });
    const token = twoFactorService.generateToken(secret);

    const result = await authService.verify2FA(sessionId, token);

    expect(result.accessToken).toBe('jwt-token');
    expect(result.twoFactorEnabled).toBe(true);
    expect(result.pendingSetupResolved).toBe(false);
  });

  it('verify2FA rejects with expired/invalid sessionId', async () => {
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: 'abc', twoFactorEnabled: true, email: 'user@test.io', role: 'USER' });

    await expect(authService.verify2FA('invalid-session', '123456')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('verify2FA rejects when 2FA secret is missing on user', async () => {
    const sessionId = otpSessionService.createSession('u1', 'user@test.io');
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: null, twoFactorEnabled: false, email: 'user@test.io', role: 'USER' });

    await expect(authService.verify2FA(sessionId, '123456')).rejects.toThrow(BadRequestException);
  });

  it('verify2FA rejects an invalid TOTP token', async () => {
    const secret = twoFactorService.generateSecret();
    const sessionId = otpSessionService.createSession('u1', 'user@test.io');
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: secret, twoFactorEnabled: true, email: 'user@test.io', role: 'USER' });

    await expect(authService.verify2FA(sessionId, '000000')).rejects.toThrow(BadRequestException);
  });

  it('verify2FA auto-enables 2FA when user is in pending setup', async () => {
    const secret = twoFactorService.generateSecret();
    const sessionId = otpSessionService.createSession('u1', 'user@test.io');
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: secret, twoFactorEnabled: false, email: 'user@test.io', role: 'USER' });
    const token = twoFactorService.generateToken(secret);

    const result = await authService.verify2FA(sessionId, token);

    expect(result.pendingSetupResolved).toBe(true);
    expect(enableTwoFactor).toHaveBeenCalledWith('u1', secret);
    expect(result.twoFactorEnabled).toBe(true);
  });

  // ─── disable2FA ────────────────────────────────────────────────────────────

  it('disable2FA clears the secret after a valid token', async () => {
    const secret = twoFactorService.generateSecret();
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: secret, twoFactorEnabled: true });
    const token = twoFactorService.generateToken(secret);

    await expect(authService.disable2FA('u1', token)).resolves.toEqual({
      message: '2FA đã được tắt thành công',
    });
    expect(disableTwoFactor).toHaveBeenCalledWith('u1');
  });

  it('disable2FA rejects when 2FA is not enabled', async () => {
    findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: null, twoFactorEnabled: false });

    await expect(authService.disable2FA('u1', '123456')).rejects.toThrow(BadRequestException);
    expect(disableTwoFactor).not.toHaveBeenCalled();
  });

  // ─── validateUser ──────────────────────────────────────────────────────────

  it('validateUser returns requires2FA=false + no session khi không có 2FA', async () => {
    findByEmailWithPassword.mockResolvedValue({
      id: 'u1',
      email: 'user@test.io',
      twoFactorSecret: null,
      twoFactorEnabled: false,
      comparePassword: vi.fn().mockResolvedValue(true),
    });

    const result = await authService.validateUser('user@test.io', 'password');

    expect(result.requires2FA).toBe(false);
    expect(result.pendingSetup).toBe(false);
    expect(result.sessionId).toBeNull();
    expect(otpSessionService['sessions'].size).toBe(0);
  });

  it('validateUser returns requires2FA=true dengan sessionId khi 2FA đã kích hoạt', async () => {
    findByEmailWithPassword.mockResolvedValue({
      id: 'u1',
      email: 'user@test.io',
      twoFactorSecret: 'abc123',
      twoFactorEnabled: true,
      comparePassword: vi.fn().mockResolvedValue(true),
    });

    const result = await authService.validateUser('user@test.io', 'password');

    expect(result.requires2FA).toBe(true);
    expect(result.pendingSetup).toBe(false);
    expect(result.sessionId).not.toBeNull();
    expect(otpSessionService.getSession(result.sessionId!)).not.toBeNull();
  });

  it('validateUser trả requires2FA=true + pendingSetup=true khi có secret nhưng chưa kích hoạt', async () => {
    findByEmailWithPassword.mockResolvedValue({
      id: 'u1',
      email: 'user@test.io',
      twoFactorSecret: 'abc123',
      twoFactorEnabled: false,
      comparePassword: vi.fn().mockResolvedValue(true),
    });

    const result = await authService.validateUser('user@test.io', 'password');

    expect(result.requires2FA).toBe(true);
    expect(result.pendingSetup).toBe(true);
    expect(result.sessionId).not.toBeNull();
  });

  it('validateUser rejects invalid password', async () => {
    findByEmailWithPassword.mockResolvedValue({
      id: 'u1',
      email: 'user@test.io',
      twoFactorSecret: null,
      twoFactorEnabled: false,
      comparePassword: vi.fn().mockResolvedValue(false),
    });

    await expect(authService.validateUser('user@test.io', 'wrong')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('validateUser rejects unknown email', async () => {
    findByEmailWithPassword.mockResolvedValue(null);

    await expect(authService.validateUser('nope@test.io', 'password')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
