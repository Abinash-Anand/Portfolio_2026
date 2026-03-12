import { Component, signal, AfterViewInit, ElementRef, QueryList, ViewChildren, OnDestroy, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectCatalogue } from '../../../json/project-registry';
import { ActivatedRoute } from '@angular/router';
import { ProjectSection } from '../../interface/project-section';

@Component({
  selector: 'app-generic-project-card-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generic-project-card-component.html',
  styleUrl: './generic-project-card-component.css',
})
export class GenericProjectCardComponent implements OnInit, AfterViewInit, OnDestroy {
  
  activeSectionId = signal<string>('overview');
  route = inject(ActivatedRoute);
  private observer: IntersectionObserver | null = null;
  
  projectRepoName: string | null = '';
  
  // Initialize as an empty array of ProjectSections
  projectData: ProjectSection[] = []; 
  
  // Grab all elements marked with #sectionElement in the HTML
  @ViewChildren('sectionElement') sectionElements!: QueryList<ElementRef>;

  // 1. Fetch the route and filter the data BEFORE the view initializes
  ngOnInit() {
    this.projectRepoName = this.route.snapshot.paramMap.get("id");
    console.log(this.projectRepoName)
  
    const foundProject = ProjectCatalogue.find((projectArray) => {
    
       return projectArray[0].sectionId === this.projectRepoName; 
    });

    if (foundProject) {
      this.projectData = foundProject;
    } else {
      console.error("Project not found!");
      this.projectData = [];
    }
  }

  // 2. Set up the observer AFTER the view (and the HTML loops) have rendered
  ngAfterViewInit() {
    // We need a slight timeout because @ViewChildren might take a tick to populate 
    // after the @for loop renders the projectData
    setTimeout(() => {
      this.setupIntersectionObserver();
    }, 100);
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupIntersectionObserver() {
    const options = {
      root: null,
      rootMargin: '-20% 0px -70% 0px', 
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.activeSectionId.set(entry.target.id);
        }
      });
    }, options);

    this.sectionElements.forEach(el => {
      this.observer?.observe(el.nativeElement);
    });
  }

  scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.activeSectionId.set(id); 
    }
  }

  formatLabel(id: string): string {
    return id.replace('-', ' ');
  }
}