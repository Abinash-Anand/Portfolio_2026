import { ProjectSection } from "../app/interface/project-section";

export const parkRabbitData: ProjectSection[] = [
  {
    sectionId: "ParkRabbit",
    sectionHeading: "🚗 Parking Management System",
    sectionDescription: "A production-style event-driven system built using Spring Boot, React, RabbitMQ, PostgreSQL, and Docker.",
    sectionIcon: "bi bi-info-circle", // Example bootstrap icon class, change to yours
    cardConfig: [
      {
        cardIcon: "bi bi-bullseye",
        cardHeading: "Project Goal",
        cardDescription: "Demonstrate backend-driven workflows and message-based communication.",
        details: [
          "Event-driven notification management",
          "Services communicate via RabbitMQ",
          "Scheduled jobs / cron-based events",
          "Lightweight frontend focus"
        ],
        cardStyle: "border-l-4 border-purple-500 bg-white shadow-sm"
      },
      {
        cardIcon: "bi bi-cpu",
        cardHeading: "Core Concepts",
        cardDescription: "Key architectural patterns demonstrated in this repository.",
        details: [
          "Publish–Subscribe pattern (RabbitMQ)",
          "Backend-triggered notifications",
          "Containerized deployment (Docker)"
        ],
        cardStyle: "border-l-4 border-blue-500 bg-white shadow-sm"
      }
    ],
    sectionStyles: {
      containerstyle: "flex flex-col gap-6",
      iconWrapperstyle: "p-4 bg-purple-50 rounded-xl",
      iconstyle: "text-purple-600 w-8 h-8",
      titlestyle: "text-4xl font-extrabold text-gray-900",
      descriptionstyle: "text-xl text-gray-600 max-w-3xl"
    }
  },
  {
    sectionId: "architecture",
    sectionHeading: "System Architecture",
    sectionDescription: "Multi-service architecture using a Message Broker for asynchronous processing.",
    sectionIcon: "bi bi-diagram-3",
    cardConfig: [
      {
        cardIcon: "bi bi-server",
        cardHeading: "Spring Boot",
        cardDescription: "Layered backend handling business logic, persistence, and message production.",
        cardStyle: "bg-blue-50 border border-blue-200"
      },
      {
        cardIcon: "bi bi-chat-square-dots",
        cardHeading: "RabbitMQ",
        cardDescription: "The central nervous system for asynchronous messaging and service decoupling.",
        cardStyle: "bg-green-50 border border-green-200"
      },
      {
        cardIcon: "bi bi-database",
        cardHeading: "PostgreSQL",
        cardDescription: "Reliable relational storage for users, slots, and notification history.",
        cardStyle: "bg-indigo-50 border border-indigo-200"
      }
    ],
    sectionStyles: {
      containerstyle: "flex flex-col gap-6",
      iconWrapperstyle: "p-4 bg-blue-50 rounded-xl",
      iconstyle: "text-blue-600 w-8 h-8",
      titlestyle: "text-4xl font-extrabold text-gray-900",
      descriptionstyle: "text-xl text-gray-600 max-w-3xl"
    }
  },
  {
    sectionId: "user-workflow",
    sectionHeading: "Detailed User Workflow",
    sectionDescription: "The lifecycle of a parking session, from authentication to session termination.",
    sectionIcon: "bi bi-person-lines-fill",
    cardConfig: [
      {
        cardIcon: "bi bi-box-arrow-in-right",
        cardHeading: "Step 1: Auth & Dashboard",
        cardDescription: "User registers and logs in via Spring Boot Security.",
        detailLabel: "Backend Actions",
        details: ["JWT token issuance", "User session context established"],
        cardStyle: "bg-white p-6 rounded-lg shadow-md"
      },
      {
        cardIcon: "bi bi-geo-alt",
        cardHeading: "Step 2: Location Selection",
        cardDescription: "User selects: In Der Au, Stadtmitte, or Hauptbahnhof.",
        detailLabel: "Process",
        details: ["Real-time slot availability check initiated"],
        cardStyle: "bg-white p-6 rounded-lg shadow-md"
      }
    ],
    sectionStyles: {
      containerstyle: "flex flex-col gap-6",
      iconWrapperstyle: "p-4 bg-pink-50 rounded-xl",
      iconstyle: "text-pink-600 w-8 h-8",
      titlestyle: "text-4xl font-extrabold text-gray-900",
      descriptionstyle: "text-xl text-gray-600 max-w-3xl"
    }
  },
  {
    sectionId: "event-flow",
    sectionHeading: "Event Flow (Scenarios)",
    sectionDescription: "How the system handles different availability states asynchronously.",
    sectionIcon: "bi bi-lightning-charge",
    cardConfig: [
      {
        cardIcon: "bi bi-check-circle",
        cardHeading: "Scenario A: Slot Available",
        cardDescription: "Immediate confirmation and 1-minute parking window.",
        detailLabel: "Backend Actions",
        details: [
          "Slot availability validated",
          "Reservation event published to RabbitMQ",
          "Spring Scheduler starts 1-min countdown"
        ],
        cardStyle: "border-2 border-green-500 bg-green-50"
      },
      {
        cardIcon: "bi bi-clock-history",
        cardHeading: "Scenario B: Queueing",
        cardDescription: "All slots full; user added to waitlist.",
        detailLabel: "Backend Actions",
        details: [
          "User ID added to reservation queue",
          "Queue state managed via RabbitMQ"
        ],
        cardStyle: "border-2 border-amber-500 bg-amber-50"
      }
    ],
    sectionStyles: {
      containerstyle: "flex flex-col gap-6",
      iconWrapperstyle: "p-4 bg-amber-50 rounded-xl",
      iconstyle: "text-amber-600 w-8 h-8",
      titlestyle: "text-4xl font-extrabold text-gray-900",
      descriptionstyle: "text-xl text-gray-600 max-w-3xl"
    }
  },
  {
    sectionId: "tech-stack",
    sectionHeading: "Technology Stack",
    sectionDescription: "Multi-layered tech stack for high-performance messaging.",
    sectionIcon: "bi bi-layers",
    cardConfig: [
      {
        cardIcon: "bi bi-hdd-network",
        cardHeading: "Backend",
        cardDescription: "Java 17 & Spring Boot",
        details: ["RabbitMQ", "PostgreSQL", "Spring Scheduler", "Spring Security (JWT)"],
        cardStyle: "bg-white border shadow-sm"
      },
      {
        cardIcon: "bi bi-display",
        cardHeading: "Frontend",
        cardDescription: "React (Vite)",
        details: ["React Router", "WebSockets", "Toasts + List notifications"],
        cardStyle: "bg-white border shadow-sm"
      },
      {
        cardIcon: "bi bi-boxes",
        cardHeading: "Infrastructure",
        cardDescription: "Dockerized Environment",
        details: ["Docker Compose", "Nginx (Serving Frontend)", "Mono-repo Structure"],
        cardStyle: "bg-white border shadow-sm"
      }
    ],
    sectionStyles: {
      containerstyle: "flex flex-col gap-6",
      iconWrapperstyle: "p-4 bg-indigo-50 rounded-xl",
      iconstyle: "text-indigo-600 w-8 h-8",
      titlestyle: "text-4xl font-extrabold text-gray-900",
      descriptionstyle: "text-xl text-gray-600 max-w-3xl"
    }
  },
  {
    sectionId: "repository",
    sectionHeading: "Monorepo Structure",
    sectionDescription: "Structured for separation of concerns and containerized deployment.",
    sectionIcon: "bi bi-folder2-open",
    cardConfig: [],
    rawContent: `ParkRabbit/
├── backend/ (Spring Boot)
├── frontend/ (React + Nginx)
├── docker-compose.yml
└── .env`,
    sectionStyles: {
      containerstyle: "flex flex-col gap-6",
      iconWrapperstyle: "p-4 bg-gray-100 rounded-xl",
      iconstyle: "text-gray-600 w-8 h-8",
      titlestyle: "text-4xl font-extrabold text-gray-900",
      descriptionstyle: "text-xl text-gray-600 max-w-3xl"
    }
  },
  {
    sectionId: "deployment",
    sectionHeading: "Deployment",
    sectionDescription: "Run the entire system with these commands.",
    sectionIcon: "bi bi-terminal",
    cardConfig: [
      {
        cardIcon: "bi bi-hammer",
        cardHeading: "Build Backend",
        cardDescription: "Generate JAR file.",
        details: ["cd backend", "./mvnw clean package -DskipTests"],
        cardStyle: "bg-zinc-900 text-white"
      },
      {
        cardIcon: "bi bi-play-circle",
        cardHeading: "Launch Docker",
        cardDescription: "Start all services.",
        details: ["cd ..", "docker compose up --build"],
        cardStyle: "bg-zinc-900 text-white"
      }
    ],
    sectionStyles: {
      containerstyle: "flex flex-col gap-6",
      iconWrapperstyle: "p-4 bg-zinc-100 rounded-xl",
      iconstyle: "text-zinc-800 w-8 h-8",
      titlestyle: "text-4xl font-extrabold text-gray-900",
      descriptionstyle: "text-xl text-gray-600 max-w-3xl"
    }
  },
  {
    sectionId: "challenges",
    sectionHeading: "Challenges & Solutions",
    sectionDescription: "Key technical hurdles overcome during development.",
    sectionIcon: "bi bi-tools",
    cardConfig: [
       {
        cardIcon: "bi bi-shield-exclamation",
        cardHeading: "Frontend Coupling",
        cardDescription: "Problem: Frontend was originally tightly coupled to notification generation.",
        details: ["Solution: Moved all notification logic to backend and delivered via WebSockets."],
        cardStyle: "bg-red-50 border border-red-200"
      },
      {
        cardIcon: "bi bi-hourglass-split",
        cardHeading: "Time-based Logic",
        cardDescription: "Problem: Handling reservation expirations accurately without polling.",
        details: ["Solution: Implemented Spring Scheduler to trigger timeout events published to RabbitMQ."],
        cardStyle: "bg-teal-50 border border-teal-200"
      }
    ],
    sectionStyles: {
      containerstyle: "flex flex-col gap-6",
      iconWrapperstyle: "p-4 bg-red-50 rounded-xl",
      iconstyle: "text-red-600 w-8 h-8",
      titlestyle: "text-4xl font-extrabold text-gray-900",
      descriptionstyle: "text-xl text-gray-600 max-w-3xl"
    }
  }
];