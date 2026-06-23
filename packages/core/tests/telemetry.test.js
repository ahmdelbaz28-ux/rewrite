const telemetry = require('../src/telemetry');

describe('Telemetry', () => {
  beforeEach(() => {
    telemetry.disable();
  });

  describe('init', () => {
    test('initializes with config', () => {
      telemetry.init({
        enabled: true,
        endpoint: 'http://localhost:4000',
        anonymousId: 'test-anon-id'
      });
      expect(telemetry.getQueueSize()).toBeGreaterThanOrEqual(0);
    });

    test('initializes with disabled flag', () => {
      telemetry.init({ enabled: false });
    });
  });

  describe('track', () => {
    test('tracks an event when enabled', () => {
      telemetry.init({ enabled: true, anonymousId: 'test-anon' });
      telemetry.track('test_event', { foo: 'bar' });
      expect(telemetry.getQueueSize()).toBeGreaterThan(0);
    });

    test('does not track when disabled', () => {
      telemetry.disable();
      telemetry.track('test_event');
      expect(telemetry.getQueueSize()).toBe(0);
    });
  });

  describe('EVENTS', () => {
    test('has standard events', () => {
      expect(telemetry.EVENTS.EXTENSION_ACTIVATED).toBe('extension_activated');
      expect(telemetry.EVENTS.CLI_INVOKED).toBe('cli_invoked');
      expect(telemetry.EVENTS.CORRECTION_APPLIED).toBe('correction_applied');
      expect(telemetry.EVENTS.LICENSE_VALIDATED).toBe('license_validated');
    });
  });

  describe('disable', () => {
    test('clears the queue', () => {
      telemetry.init({ enabled: true, anonymousId: 'test-anon' });
      telemetry.track('test_event');
      telemetry.disable();
      expect(telemetry.getQueueSize()).toBe(0);
    });
  });
});
