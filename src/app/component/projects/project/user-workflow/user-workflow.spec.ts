import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserWorkflow } from './user-workflow';

describe('UserWorkflow', () => {
  let component: UserWorkflow;
  let fixture: ComponentFixture<UserWorkflow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserWorkflow],
    }).compileComponents();

    fixture = TestBed.createComponent(UserWorkflow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
