import { describe, expect, it } from 'vitest';
import { parseDeviceEnvironment } from '../useClientDevice';

describe('parseDeviceEnvironment', () => {
  it('detects ios mobile', () => {
    const info = parseDeviceEnvironment({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      viewportWidth: 390,
      pointerCoarse: true,
    });
    expect(info.isMobile).toBe(true);
    expect(info.os).toBe('ios');
  });

  it('detects android tablet', () => {
    const info = parseDeviceEnvironment({
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel Tablet)',
      viewportWidth: 1024,
      pointerCoarse: true,
    });
    expect(info.isTablet).toBe(true);
    expect(info.os).toBe('android');
  });

  it('detects desktop', () => {
    const info = parseDeviceEnvironment({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2)',
      viewportWidth: 1440,
      pointerCoarse: false,
    });
    expect(info.isMobile).toBe(false);
    expect(info.os).toBe('macos');
  });
});
