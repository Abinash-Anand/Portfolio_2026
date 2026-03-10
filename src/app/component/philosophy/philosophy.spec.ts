import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Philosophy } from './philosophy';

describe('Philosophy', () => {
  let component: Philosophy;
  let fixture: ComponentFixture<Philosophy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Philosophy],
    }).compileComponents();

    fixture = TestBed.createComponent(Philosophy);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
