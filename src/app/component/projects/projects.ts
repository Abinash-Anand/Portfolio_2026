import { Component } from '@angular/core';
import { Section } from '../../interface/section';
import { GenericCard } from '../generic-card/generic-card';
import { Project } from './project/project';

@Component({
  selector: 'app-projects',
  imports: [GenericCard],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects {
  projectSelectedObject:any
  sectionObject: Section = {
    sectionId:"projects",
    sectionHeading:'Projects',
    sectionDescription:'',
    cardConfig:[
      {
        cardHeading:"ParkRabbit",
        banner:'assets/parkRabbit.png',
        route:`/project/ParkRabbit`,
        technologyStack:["React","SpringBoot", "RabbitMQ", "PostgreSQL", "Web Sockets","Docker"],
        cardDescription:`An event-driven parking management system designed with a professional Angular frontend and a Spring Boot backend. It uses RabbitMQ to process asynchronous booking workflows and real-time notifications. `,
        cardLinks:[{label:"Github", link:'https://github.com/Abinash-Anand/ParkRabbit'},],
        cardStyles:'project-item project-stack project-desc project-links',
      },
      {
        cardHeading:"Eber",
        banner:'assets/taxiBooking.jpg',
        route:'/project/eber',
        technologyStack:["Angular", "Google Map","Node.js","Express", "MongoDB", 'WebScokets', "Payment Gateway"],
        cardDescription:`A full-stack ride-booking platform featuring an Angular frontend with real-time vehicle tracking via WebSockets and Google Map integration. It manages the complete ride lifecycle, from automated booking requests to secure payment processing. `,
        cardLinks:[{label:"Github", link:'https://github.com/Abinash-Anand/Eber-app'},],
        cardStyles:'project-item project-stack project-desc project-links',
      },
      
    ],
    sectionStyles:{
        container:"mesh-bg-project projects-section text-black",
        wrapper:"max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 px-6 md:px-8 py-32 w-full",
        leftColumn:"md:col-span-4",
        rightColumn:"md:col-span-8 space-y-16"
    }
  }

  
}
