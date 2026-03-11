import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventWorkflow } from './event-workflow';

describe('EventWorkflow', () => {
  let component: EventWorkflow;
  let fixture: ComponentFixture<EventWorkflow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventWorkflow],
    }).compileComponents();

    fixture = TestBed.createComponent(EventWorkflow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
