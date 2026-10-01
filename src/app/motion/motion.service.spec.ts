import { TestBed } from '@angular/core/testing';
import type { Capabilities } from './capabilities';
import { CAPABILITY_PROBE, MotionService } from './motion.service';

const strong: Capabilities = {
  reducedMotion: false,
  webgl2: true,
  hardwareConcurrency: 12,
  deviceMemoryGb: 16,
  coarsePointer: false,
  saveData: false,
};

function setup(capabilities: Capabilities = strong) {
  const probe = vi.fn(() => capabilities);
  TestBed.configureTestingModule({ providers: [{ provide: CAPABILITY_PROBE, useValue: probe }] });
  return { service: TestBed.inject(MotionService), probe };
}

describe('MotionService', () => {
  it('probes lazily and only once', () => {
    const { service, probe } = setup();
    expect(probe).not.toHaveBeenCalled();
    expect(service.detectedTier()).toBe('high');
    service.capabilities();
    service.tier();
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('uses the detected tier by default', () => {
    expect(setup().service.tier()).toBe('high');
    TestBed.resetTestingModule();
    expect(setup({ ...strong, webgl2: false }).service.tier()).toBe('static');
  });

  it('lets an explicit user choice win over everything', () => {
    const { service } = setup({ ...strong, webgl2: false });
    service.setChoice('medium');
    expect(service.tier()).toBe('medium');
    service.reportGovernorTier('low');
    expect(service.tier()).toBe('medium');
    service.setChoice('auto');
    expect(service.tier()).toBe('static');
  });

  it('applies the governor correction in auto mode and clears it when the choice changes', () => {
    const { service } = setup();
    service.reportGovernorTier('low');
    expect(service.tier()).toBe('low');
    service.setChoice('auto');
    expect(service.tier()).toBe('high');
  });

  it('cycles auto -> high -> medium -> low -> static -> auto', () => {
    const { service } = setup();
    const seen: string[] = [service.userChoice()];
    for (let i = 0; i < 5; i++) {
      service.cycleChoice();
      seen.push(service.userChoice());
    }
    expect(seen).toEqual(['auto', 'high', 'medium', 'low', 'static', 'auto']);
  });

  it('exposes reduced motion from the probe', () => {
    const { service } = setup({ ...strong, reducedMotion: true });
    expect(service.reducedMotion()).toBe(true);
    expect(service.tier()).toBe('static');
  });
});
