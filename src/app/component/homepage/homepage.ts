import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';

import { Navbar } from '../navbar/navbar';
import { Projects } from '../projects/projects';
import { About } from '../about/about';
import { Skills } from '../skills/skills';
import { Contact } from '../contact/contact';
import { Footer } from '../footer/footer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

interface MousePosition {
  x: number;
  y: number;
}

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [ About, Projects, Skills, Contact, Footer],
  templateUrl: './homepage.html',
  styleUrls: ['./homepage.css']
})
export class Homepage implements OnInit, OnDestroy {
  private observer?: IntersectionObserver;
  @ViewChild('nameElement') nameElement!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  mousePos: MousePosition = { x: 0, y: 0 };
  cursorVariant: 'default' | 'hover' = 'default';

  skills = [
    'ANGULAR',
    'TYPESCRIPT',
    'SCALABLE SYSTEMS',
    'REST APIs',
    'EVENT DRIVEN',
    'REAL TIME APPS'
  ];

  socialIcons = [
    { icon: 'github', href: '#' },
    { icon: 'linkedin', href: '#' },
    { icon: 'x', href: '#' },
    { icon: 'insta', href: '#' }

  ];

  stats = [
    { num: '01', suffix: '+', label: 'YEARS EXP' },
    { num: '5', suffix: '+', label: 'PROJECTS' },
    // { num: '99', suffix: '%', label: 'SATISFACTION' }
  ];

  private particles: Particle[] = [];
  private animationId?: number;

  // -------- NEW VARIABLES FOR SMOOTH TILT --------
  private targetMouseX = 0;
  private targetMouseY = 0;
  private tiltFrame?: number;

  ngOnInit(): void {
    setTimeout(() => {
      this.initParticles();
    }, 100);
      this.initParallaxObserver();
  }

ngOnDestroy(): void {

  if (this.animationId) {
    cancelAnimationFrame(this.animationId);
  }

  if (this.observer) {
    this.observer.disconnect();
  }

}
  // Parallax 
initParallaxObserver() {

  const sections = document.querySelectorAll('.parallax-section');

  this.observer = new IntersectionObserver(
    (entries) => {

      entries.forEach(entry => {

        if(entry.isIntersecting){

          entry.target.classList.add('parallax-visible');

        } else {

          entry.target.classList.remove('parallax-visible');

        }

      });

    },
    {
      threshold: 0.15
    }
  );

  sections.forEach(section => {
    this.observer?.observe(section);
  });

}
  // -------- MOUSE MOVE HANDLER --------

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {

    this.mousePos = { x: event.clientX, y: event.clientY };

    this.targetMouseX = event.clientX;
    this.targetMouseY = event.clientY;

    if (!this.tiltFrame) {
      this.tiltFrame = requestAnimationFrame(() => this.updateTilt());
    }
  }

  // -------- RESIZE HANDLER --------

  @HostListener('window:resize')
  onResize(): void {

    if (!this.canvasElement?.nativeElement) return;

    const canvas = this.canvasElement.nativeElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  // -------- SMOOTH TILT ANIMATION --------

updateTilt(): void {

  if (!this.nameElement?.nativeElement) {
    this.tiltFrame = undefined;
    return;
  }

  const rect = this.nameElement.nativeElement.getBoundingClientRect();

  let x = (this.targetMouseX - rect.left) / rect.width;
  let y = (this.targetMouseY - rect.top) / rect.height;

  // CLAMP values so they stay between 0 and 1
  x = Math.max(0, Math.min(1, x));
  y = Math.max(0, Math.min(1, y));

  const tiltX = (y - 0.5) * 10;
  const tiltY = (x - 0.5) * -10;

  this.nameElement.nativeElement.style.transform =
    `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

  this.tiltFrame = undefined;
}

  // -------- PARTICLE ENGINE --------

  initParticles(): void {

    if (!this.canvasElement?.nativeElement) return;

    const canvas = this.canvasElement.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    for (let i = 0; i < 50; i++) {

      this.particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1
      });

    }

    this.animateParticles(canvas, ctx);
  }

  animateParticles(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.particles.forEach((p) => {

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
      ctx.fill();

      this.particles.forEach((p2) => {

        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(99, 102, 241, ${0.2 * (1 - dist / 150)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();

        }

      });

    });

    this.animationId = requestAnimationFrame(() =>
      this.animateParticles(canvas, ctx)
    );
  }

  // -------- TEXT SCRAMBLE EFFECT --------

  scrambleText(event: MouseEvent, finalText: string): void {

    const element = event.currentTarget as HTMLElement;
    const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    let iteration = 0;

    const interval = setInterval(() => {

      element.textContent = finalText
        .split('')
        .map((char, index) => {
          if (index < iteration) return finalText[index];
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');

      if (iteration >= finalText.length) clearInterval(interval);

      iteration += 1 / 3;

    }, 30);
  }

  // -------- MAGNETIC BUTTON EFFECT --------

  onMagneticMove(event: MouseEvent): void {

    const button = event.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();

    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    button.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  }

  onMagneticLeave(event: MouseEvent): void {

    const button = event.currentTarget as HTMLButtonElement;
    button.style.transform = 'translate(0,0)';
  }

  setCursorVariant(variant: 'default' | 'hover'): void {
    this.cursorVariant = variant;
  }

  getSkillDelay(index: number): string {
    return `${1.7 + index * 0.1}s`;
  }

}