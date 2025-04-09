import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
// services
import { SocketService } from '../../services/socket/socket.service';

@Component({
  selector: 'app-main-menu',
  imports: [ RouterLink ],
  templateUrl: './main-menu.component.html',
  styleUrl: './main-menu.component.scss'
})
export class MainMenuComponent {

  constructor(
    // private socketService: SocketService
  ) {
    // this.socketService.requestControlerRole();
    // this.socketService.sendSocketMessage({test: 'message'});
  }

}
