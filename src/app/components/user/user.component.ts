import { Component, Input } from '@angular/core';
// models
import { User } from '../../models/game';

@Component({
  selector: 'app-user',
  imports: [],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss'
})
export class UserComponent {
  @Input() user!: User;
}
