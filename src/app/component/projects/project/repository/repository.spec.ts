import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Repository } from './repository';

describe('Repository', () => {
  let component: Repository;
  let fixture: ComponentFixture<Repository>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Repository],
    }).compileComponents();

    fixture = TestBed.createComponent(Repository);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
