import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectArchitecture } from './project-architecture';

describe('ProjectArchitecture', () => {
  let component: ProjectArchitecture;
  let fixture: ComponentFixture<ProjectArchitecture>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectArchitecture],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectArchitecture);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
