import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericCard } from './generic-card';

describe('GenericCard', () => {
  let component: GenericCard;
  let fixture: ComponentFixture<GenericCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericCard],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
