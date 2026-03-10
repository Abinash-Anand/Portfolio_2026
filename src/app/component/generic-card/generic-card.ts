import { Component, input, OnInit } from '@angular/core';
import { Section } from '../../interface/section';
import { FloatingPreview } from '../floating-preview/floating-preview';

@Component({
  selector: 'app-generic-card',
  imports: [FloatingPreview],
  templateUrl: './generic-card.html',
  styleUrl: './generic-card.css',
})
export class GenericCard implements OnInit{
  sectionObject = input<Section>()
  ngOnInit(): void {
    console.log(this.sectionObject())
  }
  previewVisible = false;
previewX = 0;
previewY = 0;
previewImage = '';

showPreview(img:string){
  this.previewVisible = true;
  this.previewImage = img;
}

hidePreview(){
  this.previewVisible = false;
}

movePreview(event:MouseEvent){
  this.previewX = event.clientX + 20;
  this.previewY = event.clientY + 20;
}
}
