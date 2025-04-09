import { Injectable } from '@angular/core';
// models
import { Game } from '../../models/game';
// rxjs
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  game: Subject<Game> = new Subject();

  constructor() { }
}
