import { ProjectSection } from "../app/interface/project-section";

export const eberAppProjectData: ProjectSection[] = [
  {
    sectionId: "eber",
    sectionHeading: "🚕 Eber — Ride Booking Platform",
    sectionDescription: "A full-stack, on-demand ride-booking platform featuring a responsive Angular frontend and a robust Node.js backend. It delivers a seamless experience for riders, drivers, and admins.",
    sectionIcon: "bi bi-car-front-fill",
    cardConfig: [
      {
        cardIcon: "bi bi-globe2",
        cardHeading: "Frontend (Angular 18)",
        cardDescription: "Provides a responsive, user-friendly interface integrating real-time updates, maps, and secure authentication.",
        details: [
          "Google Maps Integration (Markers, Polylines)",
          "Live Ride Tracking via WebSockets",
          "PWA (Progressive Web App) Support",
          "Angular Material UI design"
        ],
        cardStyle: "border-l-4 border-red-500 bg-white shadow-sm"
      },
      {
        cardIcon: "bi bi-server",
        cardHeading: "Backend (Node.js)",
        cardDescription: "Offers comprehensive admin/driver management, ride tracking, billing, and notification systems.",
        details: [
          "Express.js & MongoDB architecture",
          "Stripe Payment Gateway integration",
          "Automated Email (Nodemailer) & SMS (Twilio)",
          "Browser Push Notifications"
        ],
        cardStyle: "border-l-4 border-green-500 bg-white shadow-sm"
      }
    ],
    sectionStyles: {
      containerstyle: "flex flex-col gap-6",
      iconWrapperstyle: "p-4 bg-yellow-50 rounded-xl",
      iconstyle: "text-yellow-600 w-8 h-8",
      titlestyle: "text-4xl font-extrabold text-gray-900",
      descriptionstyle: "text-xl text-gray-600 max-w-3xl"
    }
  },
  {
    sectionId: "ride-lifecycle",
    sectionHeading: "Ride Lifecycle APIs",
    sectionDescription: "The backend meticulously tracks every phase of a ride, from request to billing.",
    sectionIcon: "bi bi-signpost-split",
    cardConfig: [
      {
        cardIcon: "bi bi-1-circle",
        cardHeading: "Phase 1: Assignment & Transit",
        cardDescription: "Initial stages of the ride booking process.",
        detailLabel: "Tracking Steps",
        details: [
          "Driver Assigned: Request created, driver allocated.",
          "En Route to Pickup: Driver moves toward passenger.",
          "Arrived at Pickup: Driver reaches location."
        ],
        cardStyle: "bg-slate-50 border border-slate-200"
      },
      {
        cardIcon: "bi bi-2-circle",
        cardHeading: "Phase 2: Trip & Completion",
        cardDescription: "The core ride experience and conclusion.",
        detailLabel: "Tracking Steps",
        details: [
          "Trip Started: Ride begins.",
          "Trip Ended: Ride completes, billing is triggered."
        ],
        cardStyle: "bg-slate-50 border border-slate-200"
      },
      {
        cardIcon: "bi bi-receipt",
        cardHeading: "Phase 3: Billing & Feedback",
        cardDescription: "Post-ride operations.",
        detailLabel: "Automated Actions",
        details: [
          "Invoice Generation based on distance and dynamic pricing.",
          "Feedback Collection (ratings and reviews)."
        ],
        cardStyle: "bg-blue-50 border border-blue-200"
      }
    ],
    sectionStyles: {
      containerstyle: "flex flex-col gap-6",
      iconWrapperstyle: "p-4 bg-slate-100 rounded-xl",
      iconstyle: "text-slate-700 w-8 h-8",
      titlestyle: "text-4xl font-extrabold text-gray-900",
      descriptionstyle: "text-xl text-gray-600 max-w-3xl"
    }
  },
  {
    sectionId: "admin-features",
    sectionHeading: "Admin & System Management",
    sectionDescription: "Powerful tools for administrators to monitor rides, manage settings, and handle alerts.",
    sectionIcon: "bi bi-shield-lock",
    cardConfig: [
      {
        cardIcon: "bi bi-table",
        cardHeading: "Ride History Module",
        cardDescription: "Detailed view of all completed and cancelled rides.",
        details: [
          "Filter by status, date range, pickup/drop-off.",
          "Export logs in CSV format.",
          "View live travel paths via Google Maps Polylines."
        ],
        cardStyle: "bg-white border p-6 shadow-sm"
      },
      {
        cardIcon: "bi bi-bell-fill",
        cardHeading: "Push Notifications",
        cardDescription: "Real-time alerts for system administrators.",
        details: [
          "Sound alerts when a driver is not found.",
          "Dynamic notification counter on the dashboard.",
          "Planned: Android (Firebase) and iOS (APNs) integration."
        ],
        cardStyle: "bg-white border p-6 shadow-sm"
      },
      {
        cardIcon: "bi bi-gear-fill",
        cardHeading: "System Settings",
        cardDescription: "Centralized configuration for third-party services.",
        details: [
          "Stripe Settings (Payments & Payouts).",
          "Email Settings (SMTP/Nodemailer).",
          "SMS Settings (Twilio)."
        ],
        cardStyle: "bg-white border p-6 shadow-sm"
      }
    ],
    sectionStyles: {
      containerstyle: "flex flex-col gap-6",
      iconWrapperstyle: "p-4 bg-red-50 rounded-xl",
      iconstyle: "text-red-600 w-8 h-8",
      titlestyle: "text-4xl font-extrabold text-gray-900",
      descriptionstyle: "text-xl text-gray-600 max-w-3xl"
    }
  },
  {
    sectionId: "integrations",
    sectionHeading: "Third-Party Integrations",
    sectionDescription: "Eber leverages industry-leading services for payments, communication, and mapping.",
    sectionIcon: "bi bi-plugin",
    cardConfig: [
      {
        cardIcon: "bi bi-credit-card",
        cardHeading: "Stripe Payments",
        cardDescription: "Secure payment processing and tokenization.",
        details: [
          "Securely store cards (including 3D Secure).",
          "Charge user at trip end; transfer funds to admin.",
          "Link driver bank accounts for payouts."
        ],
        cardStyle: "border-l-4 border-indigo-500 bg-white shadow-sm"
      },
      {
        cardIcon: "bi bi-envelope-at",
        cardHeading: "Nodemailer (Email)",
        cardDescription: "Professional email templates resembling Uber.",
        details: [
          "Welcome emails on registration.",
          "Invoice emails upon ride completion."
        ],
        cardStyle: "border-l-4 border-teal-500 bg-white shadow-sm"
      },
      {
        cardIcon: "bi bi-chat-left-text",
        cardHeading: "Twilio (SMS)",
        cardDescription: "Critical event alerts sent directly to users' phones.",
        details: [
          "Driver accepted a ride / Ride started.",
          "Ride completed / Payment confirmation."
        ],
        cardStyle: "border-l-4 border-blue-500 bg-white shadow-sm"
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
    sectionId: "tech-stack",
    sectionHeading: "Technology Stack",
    sectionDescription: "The complete list of frameworks, libraries, and tools powering Eber.",
    sectionIcon: "bi bi-layers",
    cardConfig: [
      {
        cardIcon: "bi bi-browser-chrome",
        cardHeading: "Frontend Core",
        cardDescription: "Angular 18 & UI",
        details: [
          "Angular Material & Bootstrap 5",
          "RxJS & NgRx-like patterns",
          "@angular/google-maps",
          "@angular/pwa (Service Workers)"
        ],
        cardStyle: "bg-white border shadow-sm"
      },
      {
        cardIcon: "bi bi-hdd-rack",
        cardHeading: "Backend Core",
        cardDescription: "Node.js & Express",
        details: [
          "MongoDB (Mongoose)",
          "EJS (Optional templates)",
          "REST API Architecture",
          "Tested via Postman"
        ],
        cardStyle: "bg-white border shadow-sm"
      },
      {
        cardIcon: "bi bi-lightning-charge",
        cardHeading: "Real-time & Utils",
        cardDescription: "WebSockets & Packages",
        details: [
          "Socket.IO & ngx-socket-io",
          "ng-push & SweetAlert2",
          "jwt-decode & uuid",
          "node-cron (Background tasks)"
        ],
        cardStyle: "bg-white border shadow-sm"
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
    sectionId: "repository",
    sectionHeading: "Repository Structure & Deployment",
    sectionDescription: "Backend architecture and cloud hosting details.",
    sectionIcon: "bi bi-folder2-open",
    cardConfig: [
      {
        cardIcon: "bi bi-cloud-arrow-up",
        cardHeading: "Deployment Platforms",
        cardDescription: "Where the app lives on the web.",
        details: [
          "Frontend: Vercel (https://eber-app.vercel.app/)",
          "Backend: Render"
        ],
        cardStyle: "bg-zinc-900 text-white"
      }
    ],
    rawContent: `backend/
└── src/
    ├── controllers/         # Business logic for each route
    ├── models/              # Mongoose schemas
    ├── routes/              # API route definitions
    ├── middlewares/         # Auth, error handling, etc.
    ├── services/            # Stripe, email, SMS, push, etc.
    ├── utils/               # Helper functions
    ├── config/              # Environment/config loading
    ├── public/              # Static files (if needed)
    ├── app.js               # Express app setup
    └── server.js            # Server entry point`,
    sectionStyles: {
      containerstyle: "flex flex-col gap-6",
      iconWrapperstyle: "p-4 bg-gray-100 rounded-xl",
      iconstyle: "text-gray-600 w-8 h-8",
      titlestyle: "text-4xl font-extrabold text-gray-900",
      descriptionstyle: "text-xl text-gray-600 max-w-3xl"
    }
  }
];