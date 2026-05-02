"use strict";
// Stub out Socket.io / Redis so tests never need a real Redis connection.
module.exports = {
  initializeRealtime: jest.fn().mockResolvedValue(undefined),
  closeRealtime: jest.fn().mockResolvedValue(undefined),
  emitToUser: jest.fn(),
  emitToRoom: jest.fn(),
  getRealtimeServer: jest.fn().mockReturnValue(null)
};
