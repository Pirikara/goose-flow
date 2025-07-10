#!/usr/bin/env node

/**
 * GooseFlow CLI - Hierarchical AI Agent Orchestration
 * MCP拡張としてGooseに階層的タスク委譲機能を提供
 */

import { Command } from 'commander';
import { startMCPServer } from '../mcp/server.js';

const program = new Command();

program
  .name('goose-flow')
  .description('Hierarchical AI agent orchestration for Goose via MCP')
  .version('2.0.0');

// MCP拡張として起動（メイン機能）
program
  .command('mcp')
  .description('Start as MCP server for Goose integration')
  .action(async () => {
    console.log('Starting GooseFlow MCP server...');
    await startMCPServer();
  });

// ステータス確認（簡略版）
program
  .command('status')
  .description('Show MCP server status')
  .action(async () => {
    console.log('GooseFlow MCP Server Status:');
    console.log('- Version: 2.0.0');
    console.log('- Mode: Hierarchical orchestration');
    console.log('- Available tools: task, progress');
    console.log('');
    console.log('To start MCP server: npx goose-flow mcp');
    console.log('To configure Goose: npx goose-flow init');
  });

// 初期化コマンド
program
  .command('init')
  .description('Initialize goose-flow in current directory')
  .action(async () => {
    console.log('Initializing goose-flow v2.0...');
    
    // 基本的なMCP設定ファイルを作成
    const mcpConfig = {
      "servers": {
        "goose-flow": {
          "command": "npx",
          "args": ["goose-flow", "mcp"]
        }
      }
    };
    
    const fs = await import('fs/promises');
    await fs.writeFile('.goose-flow-mcp.json', JSON.stringify(mcpConfig, null, 2));
    
    console.log('✅ GooseFlow initialized!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Add the following to your Goose configuration:');
    console.log('   goose configure -> Add Extension -> Command-line Extension');
    console.log('   Name: goose-flow');
    console.log('   Command: npx goose-flow mcp');
    console.log('   Working Directory: ' + process.cwd());
    console.log('');
    console.log('2. Start orchestration:');
    console.log('   goose run --system "$(cat src-new/prompts/orchestrator.md)" --text "your task" --interactive');
  });

program.parse();