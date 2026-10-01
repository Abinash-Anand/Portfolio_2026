/**
 * Resume content. Source of truth: the owner's Master CV (2026-10-01); wording stays within the CV.
 * Deliberately excludes the phone number (this repository is public). See docs/CONCEPT.md Appendix A.
 */

export interface SkillGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly string[];
}

export interface ExperienceEntry {
  readonly id: string;
  readonly role: string;
  readonly organisation: string;
  readonly location: string;
  readonly period: string;
  readonly highlights: readonly string[];
}

export interface ProjectEntry {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly period: string;
  readonly highlights: readonly string[];
  /** GitHub repository name, when a work page exists for it (`/work/:repoSlug`). */
  readonly repoSlug?: string;
}

export interface EducationEntry {
  readonly id: string;
  readonly degree: string;
  readonly institution: string;
  readonly location: string;
  readonly period: string;
  readonly note: string;
}

export interface SpokenLanguage {
  readonly name: string;
  readonly level: string;
}

export interface Resume {
  readonly summary: string;
  readonly skills: readonly SkillGroup[];
  readonly experience: readonly ExperienceEntry[];
  readonly projects: readonly ProjectEntry[];
  readonly education: readonly EducationEntry[];
  readonly spoken: readonly SpokenLanguage[];
}

export const RESUME: Resume = {
  summary:
    'TypeScript-focused full-stack software engineer who designs, builds, and ships production software end to end, from architecture and backend/API implementation through testing and deployment. M.Sc. Software Technology student at HFT Stuttgart with a focus on software architecture and distributed systems, and hands-on production experience across React/Angular frontends and Node.js/NestJS backends.',

  skills: [
    {
      id: 'languages-frameworks',
      label: 'Languages & Frameworks',
      items: ['TypeScript', 'JavaScript', 'React', 'Angular', 'Next.js', 'Node.js', 'Express.js', 'NestJS', 'Python'],
    },
    {
      id: 'data-backend',
      label: 'Data & Backend',
      items: ['PostgreSQL', 'MongoDB', 'REST APIs', 'GraphQL', 'WebSockets', 'RabbitMQ'],
    },
    {
      id: 'architecture-engineering',
      label: 'Architecture & Engineering',
      items: [
        'Software Architecture',
        'System Design',
        'API Design',
        'Domain Modeling',
        'Git',
        'Docker',
        'CI/CD (GitHub Actions)',
        'Automated Testing (Jasmine, Vitest, Pytest)',
        'RxJS',
      ],
    },
    {
      id: 'ai-assisted',
      label: 'AI-Assisted Engineering',
      items: ['Agentic coding workflows', 'Architecture-driven AI development'],
    },
  ],

  experience: [
    {
      id: 'hft-student-assistant',
      role: 'Student Assistant, Facility Data Systems',
      organisation: 'HFT Stuttgart',
      location: 'Stuttgart, Germany',
      period: 'Jun 2026 – Aug 2026',
      highlights: [
        'Built and shipped a Python automation tool that replaced manual facility-data entry, processing 200+ records across 10+ buildings in a live production run with zero errors.',
        'Architected a hierarchical resolution and verification pipeline to guarantee data accuracy at scale, with automatic detection of missing records.',
        'Delivered a fully automated test suite (100% passing) plus independent post-import verification to confirm end-to-end data integrity in production.',
      ],
    },
    {
      id: 'letstream-sde-1',
      role: 'Software Development Engineer I',
      organisation: 'Letstream',
      location: 'Noida, India · Hybrid',
      period: 'Dec 2024 – Apr 2025',
      highlights: [
        'Built a reactive Angular dashboard for logistics tracking, improving real-time data sync speed by 25%.',
        'Cut initial load times by 40% through custom lazy-loading and GraphQL fragment optimization.',
        'Led the migration of two developers from Vue.js to Angular, cutting code-review cycle time by 15% through new coding standards and mentoring.',
        'Collaborated with backend engineers on end-to-end testing, verifying data integration across the platform before release.',
      ],
    },
    {
      id: 'elluminati-intern',
      role: 'Software Engineer, Full Stack Intern (MEAN)',
      organisation: 'Elluminati Ventures',
      location: 'Rajkot, India · Remote',
      period: 'Oct 2023 – Oct 2024',
      highlights: [
        'Built a full-stack ride-booking platform (Angular frontend, Node.js/Express/MongoDB backend) with real-time tracking, Stripe payments, and multi-channel notifications.',
        'Developed REST APIs for the complete ride lifecycle, from driver assignment through billing, tested via Postman.',
        'Implemented real-time features including WebSocket-based live tracking, browser push notifications, and PWA support.',
        'Built an admin dashboard with ride history, filtering/export, and live trip visualization via Google Maps.',
      ],
    },
  ],

  projects: [
    {
      id: 'synthgraph',
      name: 'SynthGraph',
      role: 'Builder & Core Maintainer · Open-Source Initiative',
      period: 'Aug 2026 – Present',
      repoSlug: 'SynthGraph',
      highlights: [
        'Designed and built a data lineage and control-plane system for synthetic training data during Hack-Nation Venture Labs, now maintained as an independent open-source R&D initiative.',
        'Architected a NestJS/PostgreSQL backend with strict domain boundaries, migration discipline, hashed-key authentication, and 230+ automated tests gated by CI/CD.',
        'Built a Next.js frontend dashboard and a companion Python SDK/CLI for zero-friction metadata capture.',
        'Owned system design end to end: domain modeling, API contracts, and engineering guardrails, across backend, frontend, and tooling.',
      ],
    },
    {
      id: 'parkrabbit',
      name: 'ParkRabbit',
      role: 'Event-Driven Parking Management System · Personal Project',
      period: 'Dec 2025 – Jan 2026',
      repoSlug: 'ParkRabbit',
      highlights: [
        'Designed a real-time, event-driven system using RabbitMQ and WebSockets handling 500+ concurrent state updates with low-latency UI synchronization.',
        'Built a reactive frontend architecture processing asynchronous data streams, eliminating polling and cutting client-side resource consumption by 35%.',
      ],
    },
  ],

  education: [
    {
      id: 'hft-msc',
      degree: 'M.Sc. Software Technology',
      institution: 'HFT Stuttgart',
      location: 'Stuttgart, Germany',
      period: 'Oct 2025 – Aug 2027 (expected)',
      note: 'Focus: Software Architecture, Distributed Systems',
    },
    {
      id: 'bvdu-btech',
      degree: 'B.Tech. Information Technology',
      institution: 'Bharati Vidyapeeth (DU) College of Engineering',
      location: 'Pune, India',
      period: 'Jul 2020 – Jun 2024',
      note: 'GPA: 1.6 (German scale)',
    },
  ],

  spoken: [
    { name: 'English', level: 'C1 (IELTS)' },
    { name: 'German', level: 'Conversational (A2), progressing toward B1' },
  ],
};
