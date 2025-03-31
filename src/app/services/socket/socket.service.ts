import { Injectable } from '@angular/core';
// socket.io
import { io, Socket } from 'socket.io-client';
// rxjs
import { Subject } from 'rxjs';

interface SocketEvent {
  type: string,
  data: any
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private SOCKET_URL: string = 'wss://socket-url.org';
  private socket: Socket = io(this.SOCKET_URL);

  socketEvent: Subject<SocketEvent> = new Subject();

  constructor() {
    this.socket.onAny((event, ...args) => {
      console.log(`socket.io got ${event}`, args);
    });
  }

  destroy(): void {
    this.socket.offAny();
    this.socket.disconnect();
  }
}
