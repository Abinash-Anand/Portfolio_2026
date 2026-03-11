import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TechStack } from './tech-stack';

describe('TechStack', () => {
  let component: TechStack;
  let fixture: ComponentFixture<TechStack>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TechStack],
    }).compileComponents();

    fixture = TestBed.createComponent(TechStack);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
