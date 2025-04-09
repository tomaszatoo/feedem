import { Injectable } from '@angular/core';
import { User } from '../../models/game';
// models
import { Game } from '../../models/game';
// rxjs
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class GameService {

  game: Subject<Game> = new Subject();
  // TODO -> USERS TO USERS.SERVICE
  private users: User[] = [];



  constructor() {
    this.game.subscribe({
      next: (game: Game) => {
        if (game.users) this.users = game.users;
      }
    })
  }

  getUsers(): User[] {
    return this.users;
  }

  updateUser(userId: string, updates: Partial<User>): void {
    this.users = this.users.map(user => 
      user.uuid === userId ? { ...user, ...updates } : user
    );
  }

  getUserById(userId: string): User | undefined {
    return this.users.find(user => user.uuid === userId);
  }
  

}
