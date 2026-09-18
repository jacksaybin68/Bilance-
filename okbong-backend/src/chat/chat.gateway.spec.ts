import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '../enumeration/role.enum';
import { ChatGateway } from './chat.gateway';

function buildSocket(token?: string, authorization?: string): Socket {
  return {
    handshake: {
      auth: token ? { token } : {},
      headers: authorization ? { authorization } : {},
    },
    join: vi.fn(),
    emit: vi.fn(),
  } as unknown as Socket;
}

describe('ChatGateway', () => {
  it.each([Role.ADMIN, Role.SUPER_ADMIN])('allows %s users to join the admins room', (role) => {
    const jwtService = { verify: vi.fn().mockReturnValue({ role }) } as unknown as JwtService;
    const gateway = new ChatGateway(jwtService);
    const client = buildSocket('valid-token');

    gateway.handleJoinAdmins(client);

    expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
    expect(client.join).toHaveBeenCalledWith(ChatGateway.ADMINS_ROOM);
    expect(client.emit).toHaveBeenCalledWith('chat:joined', { room: ChatGateway.ADMINS_ROOM });
  });

  it('accepts a bearer token from the authorization header', () => {
    const jwtService = {
      verify: vi.fn().mockReturnValue({ role: Role.ADMIN }),
    } as unknown as JwtService;
    const gateway = new ChatGateway(jwtService);
    const client = buildSocket(undefined, 'Bearer header-token');

    gateway.handleJoinAdmins(client);

    expect(jwtService.verify).toHaveBeenCalledWith('header-token');
    expect(client.join).toHaveBeenCalledWith(ChatGateway.ADMINS_ROOM);
  });

  it('rejects non-admin users without joining or emitting', () => {
    const jwtService = {
      verify: vi.fn().mockReturnValue({ role: Role.USER }),
    } as unknown as JwtService;
    const gateway = new ChatGateway(jwtService);
    const client = buildSocket('valid-token');

    expect(() => gateway.handleJoinAdmins(client)).toThrow('Unauthorized');
    expect(client.join).not.toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing token', undefined, undefined],
    ['an invalid token', 'invalid-token', new Error('invalid signature')],
  ])('rejects %s without joining or emitting', (_case, token, verificationError) => {
    const verify = vi.fn();
    if (verificationError) verify.mockImplementation(() => { throw verificationError; });
    const gateway = new ChatGateway({ verify } as unknown as JwtService);
    const client = buildSocket(token);

    expect(() => gateway.handleJoinAdmins(client)).toThrow('Unauthorized');
    expect(client.join).not.toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalled();
  });
});
