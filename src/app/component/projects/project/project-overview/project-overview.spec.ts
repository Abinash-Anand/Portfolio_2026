import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectOverview } from './project-overview';

describe('ProjectOverview', () => {
  let component: ProjectOverview;
  let fixture: ComponentFixture<ProjectOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectOverview],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectOverview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
