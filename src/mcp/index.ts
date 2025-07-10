#!/usr/bin/env node

/**
 * MCP拡張エントリーポイント
 * GooseからMCPサーバーとして起動される
 */

import { startMCPServer } from './server.js';

// MCP拡張として起動
startMCPServer().catch(error => {
  console.error('[GooseFlow] MCP server failed to start:', error);
  process.exit(1);
});