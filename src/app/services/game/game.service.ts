import { Injectable } from '@angular/core';
import { DefaultUsersService } from './default-users.service';
import { User } from '../../models/game';

@Injectable({
  providedIn: 'root'
})

export class GameService {
  private users: User[] = [];

  constructor(private defaultUsers: DefaultUsersService) {
    this.users = this.defaultUsers.getDefaultUsers();
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
