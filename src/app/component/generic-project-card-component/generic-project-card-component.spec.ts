import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GenericProjectCardComponent } from './generic-project-card-component';

describe('GenericProjectCardComponent', () => {
  let component: GenericProjectCardComponent;
  let fixture: ComponentFixture<GenericProjectCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericProjectCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GenericProjectCardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
