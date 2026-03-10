import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FloatingPreview } from './floating-preview';

describe('FloatingPreview', () => {
  let component: FloatingPreview;
  let fixture: ComponentFixture<FloatingPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingPreview],
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
