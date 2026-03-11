import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Deployment } from './deployment';

describe('Deployment', () => {
  let component: Deployment;
  let fixture: ComponentFixture<Deployment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Deployment],
    }).compileComponents();

    fixture = TestBed.createComponent(Deployment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
