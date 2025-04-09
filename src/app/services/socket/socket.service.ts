import { Injectable } from '@angular/core';
// socket.io
import { io, Socket } from 'socket.io-client';
// rxjs
import { Subject, BehaviorSubject } from 'rxjs';

export interface SocketEvent {
  type: string,
  data: any
}

interface SocketMessage {
  message: any
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  canControl: BehaviorSubject<boolean> = new BehaviorSubject(false);
  controllable: BehaviorSubject<boolean> = new BehaviorSubject(true);
  private SOCKET_URL: string = 'wss://fesync.lab.gajdosik.org';
  private socket: Socket = io(this.SOCKET_URL, {
    // path: '/dev',
    transports: ['websocket']
  });

  socketMessage: Subject<SocketEvent> = new Subject();

  constructor() {
    this.socket.onAny((event, ...args) => {
      console.log(`socket.io got ${event}`, args);
      // controller (start controlling the game)
      // general message || game object from server
      if (event && event === 'message' || event === 'game') {
        this.socketMessage.next({
          type: event,
          data: args[0]
        });
      }

      // new role assigned (controller)
      if (event && event === 'controller') {
        const o = args[0];
        // no one is controlling the game
        if (!o.controller_id) { 
          this.controllable.next(true);
          return;
        }
        // im the controller
        if (o.controller_id && o.controller_id === this.socket.id) { 
          this.canControl.next(true);
          this.controllable.next(false);

        // someone else is controlling the game
        } else { 
          this.controllable.next(false);
        }  
      }
    });
  }

  requestGameControl(): void {
    this.socket.emit('request_controller_role');
  }

  sendSocketMessage(value: any): void {
    this.socket.emit(value);
    console.log('send message', value);
  }

  destroy(): void {
    this.socket.offAny();
    this.socket.disconnect();
  }
}
