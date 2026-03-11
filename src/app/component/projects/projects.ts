import { Component } from '@angular/core';
import { Section } from '../../interface/section';
import { GenericCard } from '../generic-card/generic-card';

@Component({
  selector: 'app-projects',
  imports: [GenericCard],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects {
  sectionObject: Section = {
    sectionId:"projects",
    sectionHeading:'Projects',
    sectionDescription:'',
    cardConfig:[
      {
        cardHeading:"ParkRabbit",
        banner:'assets/parkRabbit.png',
        route:`/project/parkRabbit`,
        technologyStack:["Angular","SpringBoot", "RabbitMQ", "PostgreSQL"],
        cardDescription:`Event-driven parking management platform with asynchronous booking
          processing using RabbitMQ and distributed microservices.`,
        cardLinks:[{label:"github", link:'github'}, {label:"Read more", link:'/project route redirect'} ],
        cardStyles:'project-item project-stack project-desc project-links',
      },
      {
        cardHeading:"Logistics Dashboard",
        banner:'assets/logisticManagement.png',
        route:'/project/eber',
        technologyStack:["Angular", "Leaflet Map", 'WebScokets'],
        cardDescription:`Real-time logistics dashboard for vehicle tracking and route monitoring
          with reactive UI updates.`,
        cardLinks:[{label:"github", link:'github'}, {label:"Read more", link:'/project route redirect'}],
        cardStyles:'project-item project-stack project-desc project-links',
      },
      {
        cardHeading:"Gett Taxi",
        banner:'assets/taxiBooking.jpg',
        route:'',
        technologyStack:["Node.js", "Angular", "Postgres", "Docker", "RabbitMQ"],
        cardDescription:`Scalable real-time notification service supporting multiple event
          producers and client subscriptions.`,
        cardLinks:[{label:"github", link:'github'}, {label:"Read more", link:'/project route redirect'}],
        cardStyles:'project-item project-stack project-desc project-links',
      }
    ],
    sectionStyles:{
        container:"mesh-bg-project projects-section text-black",
        wrapper:"max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 px-6 md:px-8 py-32 w-full",
        leftColumn:"md:col-span-4",
        rightColumn:"md:col-span-8 space-y-16"
    }
  }
}
