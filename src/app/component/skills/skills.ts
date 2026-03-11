import { Component } from '@angular/core';
import { Section } from '../../interface/section';
import { GenericCard } from '../generic-card/generic-card';

@Component({
  selector: 'app-skills',
  imports: [GenericCard],
  templateUrl: './skills.html',
  styleUrl: './skills.css',
})
export class Skills {
  sectionObject: Section ={
    sectionId:'skills',
    sectionHeading:"Skills",
    sectionDescription:'',
    cardConfig:[{
        cardHeading:'Frontend',
        banner:'',
        route:'',
        technologyStack:[
          'Angular', "TypeScript", "RxJS"
        ],
        cardDescription:'',
        cardLinks:[],
        cardStyles:'',
    },
    {
        cardHeading:'Backend',
        banner:'',
        route:'',
        technologyStack:[
          'Node.js', "Nest.js", "REST", "JWT", "Web Security"
        ],
        cardDescription:'',
        cardLinks:[],
        cardStyles:'',
    },
    {
        cardHeading:'Data & Messaging',
        banner:'',
        route:'',
        technologyStack:[
          'PostgreSQL', "RabbitMQ", "MongoDB"
        ],
        cardDescription:'',
        cardLinks:[],
        cardStyles:'',
    },
    {
        cardHeading:'Infrastructure',
        banner:'',
        route:'',
        technologyStack:[
          'Docker', "Kubernetes"
        ],
        cardDescription:'',
        cardLinks:[],
        cardStyles:'',
    },
  ],
    sectionStyles:{
        container:'mesh-bg skills-section bg-black text-white',
        wrapper:'max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 px-6 md:px-8 py-32 w-full',
        leftColumn:'md:col-span-4',
        rightColumn:'md:col-span-8 space-y-12'
    }
  }
}
