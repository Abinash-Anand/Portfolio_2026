import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectWorkflow } from './project-workflow';

describe('ProjectWorkflow', () => {
  let component: ProjectWorkflow;
  let fixture: ComponentFixture<ProjectWorkflow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectWorkflow],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectWorkflow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
