import { Component } from '@angular/core';
import { GenericCard } from '../generic-card/generic-card';
import { Section } from '../../interface/section';

@Component({
  selector: 'app-about',
  imports: [GenericCard],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
    sectionObject: Section = {
      sectionId:'about',
      sectionHeading: "About Me",
      sectionDescription:`I am <strong>Abinash Anand</strong>, a Software Engineer and MSc student in Software Technology at <strong>Hochschule für Technik Stuttgart</strong>. My career is rooted in professional <strong>Angular Specialization </strong>, where I have led frontend teams to develop scalable logistics dashboards and real-time tracking systems.
      <br></br>While I am an established specialist in the frontend, my <strong>current focus at HFT</strong> is mastering the 'heavy lifting' of Software Technology: Advanced Software Architecture, Distributed Systems, and other subjects. I architect end-to-end systems with a focus on Clean Architecture, Performance Optimizations and Resuability.
      <br></br>I am a fast learner who has successfully moved between different backend environments while keeping my deep knowledge of the Angular ecosystem. I am currently looking for a <strong>Werkstudent role</strong> in Frontend or Full-Stack Engineering where I can build robust, production-grade products.`,
        cardConfig:[],
        sectionStyles:{
          container:"about-section bg-black text-white min-h-screen flex justify-evenly",
          wrapper: "max-w-7xl  grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 px-6 md:px-8",
          leftColumn: "md:col-span-4",
          rightColumn: "md:col-span-8 space-y-6 text-lg md:text-xl lg:text-2xl leading-relaxed",
        }
    }
}