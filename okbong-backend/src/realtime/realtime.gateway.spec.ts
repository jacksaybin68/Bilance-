import type { Server, Socket } from 'socket.io';
import { vi, type Mock } from 'vitest';
import { PriceGateway, type PriceBroadcastPayload } from './realtime.gateway';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildMockServer(roomEmit = vi.fn()): Partial<Server> {
  const rooms = new Map<string, { emit: Mock }>();

  return {
    to: vi.fn((room: string) => {
      if (!rooms.has(room)) rooms.set(room, { emit: roomEmit });
      return rooms.get(room) as ReturnType<Server['to']>;
    }),
  };
}

function buildMockSocket(id = 'socket-test-1'): Partial<Socket> {
  return {
    id,
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn(),
    rooms: new Set<string>(),
  };
}

const samplePayload: PriceBroadcastPayload = {
  symbol: 'BDSD',
  currency: 'BDSD',
  price: 25_000,
  volume: 500_000,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

// ─── Test Suites ───────────────────────────────────────────────────────────────

describe('PriceGateway', () => {
  let gateway: PriceGateway;

  beforeEach(() => {
    gateway = new PriceGateway();
  });

  // ── 1. Kết nối & ngắt kết nối ──────────────────────────────────────────────

  describe('handleConnection', () => {
    it('should log when a client connects without throwing', () => {
      const client = buildMockSocket('client-001') as Socket;
      expect(() => gateway.handleConnection(client)).not.toThrow();
    });

    it('should accept multiple concurrent clients', () => {
      ['c1', 'c2', 'c3'].forEach((id) => {
        const client = buildMockSocket(id) as Socket;
        expect(() => gateway.handleConnection(client)).not.toThrow();
      });
    });
  });

  describe('handleDisconnect', () => {
    it('should log when a client disconnects without throwing', () => {
      const client = buildMockSocket('client-001') as Socket;
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  // ── 2. Join / Leave room ────────────────────────────────────────────────────

  describe('handleJoin', () => {
    it('should join the default "price" room when no room is specified', () => {
      const client = buildMockSocket() as Socket;
      gateway.handleJoin(client, {});
      expect(client.join).toHaveBeenCalledWith('price');
      expect(client.emit).toHaveBeenCalledWith('joined', { room: 'price' });
    });

    it('should join a custom room when room is provided', () => {
      const client = buildMockSocket() as Socket;
      gateway.handleJoin(client, { room: 'BTCUSDT' });
      expect(client.join).toHaveBeenCalledWith('BTCUSDT');
      expect(client.emit).toHaveBeenCalledWith('joined', { room: 'BTCUSDT' });
    });

    it('should emit "joined" event with correct room name', () => {
      const client = buildMockSocket() as Socket;
      gateway.handleJoin(client, { room: 'custom-room' });
      expect(client.emit).toHaveBeenCalledTimes(1);
      expect(client.emit).toHaveBeenCalledWith('joined', { room: 'custom-room' });
    });
  });

  describe('handleLeave', () => {
    it('should leave the default "price" room when no room specified', () => {
      const client = buildMockSocket() as Socket;
      gateway.handleLeave(client, {});
      expect(client.leave).toHaveBeenCalledWith('price');
      expect(client.emit).toHaveBeenCalledWith('left', { room: 'price' });
    });

    it('should leave a custom room when specified', () => {
      const client = buildMockSocket() as Socket;
      gateway.handleLeave(client, { room: 'BTCUSDT' });
      expect(client.leave).toHaveBeenCalledWith('BTCUSDT');
    });
  });

  // ── 3. broadcastPrice ───────────────────────────────────────────────────────

  describe('broadcastPrice', () => {
    it('should emit "price:update" to the "price" room', () => {
      const roomEmit = vi.fn();
      gateway.server = buildMockServer(roomEmit) as Server;

      gateway.broadcastPrice(samplePayload);

      expect(gateway.server.to).toHaveBeenCalledWith('price');
      expect(roomEmit).toHaveBeenCalledWith('price:update', samplePayload);
    });

    it('should broadcast correct payload fields', () => {
      const roomEmit = vi.fn();
      gateway.server = buildMockServer(roomEmit) as Server;

      gateway.broadcastPrice(samplePayload);

      const [event, data] = roomEmit.mock.calls[0] as [string, PriceBroadcastPayload];
      expect(event).toBe('price:update');
      expect(data.symbol).toBe('BDSD');
      expect(data.price).toBe(25_000);
      expect(data.volume).toBe(500_000);
    });

    it('should NOT throw when server is not initialized (undefined)', () => {
      // server chưa được inject (e.g. unit test không có NestJS bootstrap)
      (gateway as unknown as { server: undefined }).server = undefined;
      expect(() => gateway.broadcastPrice(samplePayload)).not.toThrow();
    });

    it('should broadcast to multiple subscribers listening on the same room', () => {
      const emitCalls: PriceBroadcastPayload[] = [];
      const roomEmit = vi.fn((_event: string, data: PriceBroadcastPayload) => {
        emitCalls.push(data);
      });
      gateway.server = buildMockServer(roomEmit) as Server;

      gateway.broadcastPrice({ ...samplePayload, price: 26_000 });
      gateway.broadcastPrice({ ...samplePayload, price: 27_000 });

      expect(emitCalls).toHaveLength(2);
      expect(emitCalls[0].price).toBe(26_000);
      expect(emitCalls[1].price).toBe(27_000);
    });

    it('should include updatedAt timestamp in broadcast payload', () => {
      const roomEmit = vi.fn();
      gateway.server = buildMockServer(roomEmit) as Server;
      const now = new Date();

      gateway.broadcastPrice({ ...samplePayload, updatedAt: now });

      const [, data] = roomEmit.mock.calls[0] as [string, PriceBroadcastPayload];
      expect(data.updatedAt).toBe(now);
    });

    it('should handle null volume gracefully', () => {
      const roomEmit = vi.fn();
      gateway.server = buildMockServer(roomEmit) as Server;

      gateway.broadcastPrice({ ...samplePayload, volume: null });

      const [, data] = roomEmit.mock.calls[0] as [string, PriceBroadcastPayload];
      expect(data.volume).toBeNull();
    });
  });

  // ── 4. PriceBroadcastPayload type contract ──────────────────────────────────

  describe('PriceBroadcastPayload contract', () => {
    it('should accept payload without optional updatedAt', () => {
      const roomEmit = vi.fn();
      gateway.server = buildMockServer(roomEmit) as Server;

      const minimalPayload: PriceBroadcastPayload = {
        symbol: 'BDSD',
        currency: 'BDSD',
        price: 1000,
        volume: null,
      };

      expect(() => gateway.broadcastPrice(minimalPayload)).not.toThrow();
      expect(roomEmit).toHaveBeenCalledWith('price:update', minimalPayload);
    });
  });
});
