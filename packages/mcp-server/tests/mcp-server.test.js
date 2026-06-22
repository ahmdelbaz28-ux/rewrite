const { TOOLS, PROTOCOL_VERSION } = require('../src/mcp-server');

describe('MCP Server', () => {
  describe('Protocol', () => {
    test('exports protocol version', () => {
      expect(PROTOCOL_VERSION).toBe('2024-11-05');
    });
  });

  describe('Tools', () => {
    test('exports fix_text tool', () => {
      const tool = TOOLS.find(t => t.name === 'fix_text');
      expect(tool).toBeTruthy();
      expect(tool.inputSchema.required).toContain('text');
    });

    test('exports fix_clipboard tool', () => {
      const tool = TOOLS.find(t => t.name === 'fix_clipboard');
      expect(tool).toBeTruthy();
    });

    test('exports register_license tool', () => {
      const tool = TOOLS.find(t => t.name === 'register_license');
      expect(tool).toBeTruthy();
      expect(tool.inputSchema.required).toContain('token');
    });

    test('exports license_status tool', () => {
      const tool = TOOLS.find(t => t.name === 'license_status');
      expect(tool).toBeTruthy();
    });

    test('all tools have names and descriptions', () => {
      for (const tool of TOOLS) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeTruthy();
        expect(tool.inputSchema.type).toBe('object');
      }
    });
  });
});
