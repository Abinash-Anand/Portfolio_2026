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
      sectionDescription:`I’m a Software Engineer currently pursuing a Master's in Software
        Technology at HFT Stuttgart. I specialize in building scalable
        Angular frontends and event-driven backend systems using modern
        architectures.
         My focus is creating maintainable systems with clean architecture,
        reactive frontend patterns, and real-world distributed workflows.`,
        cardConfig:[],
        sectionStyles:{
          container:"about-section bg-black text-white min-h-screen flex justify-evenly",
          wrapper: "max-w-6xl  grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 px-6 md:px-8",
          leftColumn: "md:col-span-4",
          rightColumn: "md:col-span-8 space-y-6 text-lg md:text-xl lg:text-2xl leading-relaxed",
        }
    }
}