import { Component, inject, OnInit } from '@angular/core';
import { Navbar } from '../../navbar/navbar';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-project',
  imports: [Navbar, RouterOutlet],
  templateUrl: './project.html',
  styleUrl: './project.css',
})
export class Project {}