#!/usr/bin/env node

/**
 * GooseFlow CLI - Hierarchical AI Agent Orchestration
 * MCP拡張としてGooseに階層的タスク委譲機能を提供
 */

import { Command } from 'commander';
import { startMCPServer } from '../mcp/server.js';
import { ORCHESTRATOR_PROMPT } from '../prompts/orchestrator.js';

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
    console.log('- Available tools: task, parallel_tasks, progress');
    console.log('');
    console.log('To start MCP server: npx goose-flow mcp');
    console.log('To configure Goose: goose configure -> Add Extension -> Command-line Extension');
  });

// オーケストレーター実行（便利コマンド）
program
  .command('orchestrate')
  .description('Run goose with orchestrator prompt')
  .argument('<task>', 'Task description')
  .action(async (task: string) => {
    console.log('Starting orchestrator with task:', task);
    
    // Check if MCP server is running (basic check)
    console.log('Note: Make sure MCP server is running (goose-flow mcp)');
    
    const { execa } = await import('execa');
    
    try {
      // Use embedded orchestrator prompt
      const prompt = ORCHESTRATOR_PROMPT;
      
      // Run goose with orchestrator prompt
      const gooseProcess = execa('goose', [
        'run',
        '--system', prompt,
        '--text', task
      ], {
        stdio: 'inherit'
      });
      
      await gooseProcess;
      
    } catch (error) {
      console.error('Error running orchestrator:', error instanceof Error ? error.message : String(error));
      console.log('');
      console.log('Make sure:');
      console.log('1. MCP server is running: goose-flow mcp');
      console.log('2. Goose is installed and configured');
    }
  });


program.parse();