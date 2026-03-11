import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Challenges } from './challenges';

describe('Challenges', () => {
  let component: Challenges;
  let fixture: ComponentFixture<Challenges>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Challenges],
    }).compileComponents();

    fixture = TestBed.createComponent(Challenges);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
