import { Component, Input, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
// models
import { BigFive, User, React, PlutchikEmotions, Task } from '../../models/game';
// components
import { RadarComponent, RadarData } from '../radar/radar.component';
import { ValueIndicatorComponent } from '../value-indicator/value-indicator.component';
import { MaterialModule } from '../../modules/material/material.module';
// uuid
import { v4 as uuidv4 } from 'uuid';
import Typed from 'typed.js';
import { GameService } from '../../services/game/game.service';
import { getCommentChanceOfUser, getReactionChancesOfUser, getUserEmotionScores } from '../../shared/utils';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-user',
  imports: [ CommonModule, RadarComponent, ValueIndicatorComponent, MaterialModule ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss'
})
export class UserComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() user!: User | undefined;
  @Input() following: string[] = [];
  @Input() followers: string[] = [];
  @ViewChild('bioElement') bioElement!: ElementRef;

  private taskSub: Subscription = new Subscription();

  big5Data: RadarData[] = [];

  isHero: boolean = false;

  constructor(
    private gameService: GameService
  ) {}

  ngOnInit(): void {
    if (this.user) {
      if (this.user.big_five) this.big5Data.push(this.getRadarData(this.user.big_five));
      // if (this.user.plutchik) this.plutchikData.push(this.getRadarData(this.user.plutchik));
    }
    this.isHero = this.user?.uuid === this.gameService.game.hero;
    // recalcualte big five on task
    this.taskSub = this.gameService.gameMessage.subscribe({
      next: (message: any) => {
        // console.log('game message', message);
        // VERY, VERY BAD SOLUTION :/
        if (message.data && message.data.command && message.data.command === 'task' && this.user && this.user.big_five) {
          console.log('----> RECALCULATE BIG5');
          this.big5Data.length = 0;
          this.big5Data.push(this.getRadarData(this.user.big_five));
        }
      }
    })
  }

  ngAfterViewInit() {
    if (this.user?.bio) {
      const bioTyped = new Typed(this.bioElement.nativeElement, {
        strings: [this.user.bio],
        typeSpeed: 5,
        showCursor: false,
        loop: true,
        backDelay: 60000, // 60 seconds
        backSpeed: 1,
        fadeOut: true,
        // fadeOutClass: 'typed-fade-out',
      });
    }
  }

  ngOnDestroy(): void {
    this.taskSub.unsubscribe();
  }

  private getRadarData(model: any): RadarData {
    const data: RadarData = {
      id: uuidv4(),
      items: [],
      name: '',
      color: '#ddd'
    };
    for (const key in model) {
      data.items.push({
        name: key,
        value: model[key as keyof BigFive || key as keyof PlutchikEmotions],
        color: '#ddd'
      });
    }
    return data;
  }

  getUser(userId: string): User {
    return this.gameService.getUserById(userId);
  }

  getCommentChanceOfUser(user: User): number {
    return getCommentChanceOfUser(user, this.gameService.game.comments, this.gameService.game.views);
  }

  getReactionChancesOfUser(user: User): Map<React, number> {
    return getReactionChancesOfUser(user, this.gameService.game.reactions, this.gameService.game.views);
  }

  getUserEmotionScores(user: User): Map<string, number> {
    // TODO: JUST DO NOT KNOW WHY IT IS 😁 0.5 😢 0.3 😴 0.2 🤦‍♂️ 0.2 ALL THE FUCKING TIME
    // WHILE THE REACTIONS WORKS JUST FINE
    return getUserEmotionScores(user, this.gameService.game.views);
  }

  keys(object: any): string[] {
    return Object.keys(object);
  }

  value(object: any, key: string): any {
    return object[key];
  }

  plutchikLabelsFromKey(key: string): string[] {
    return key.split('_');
  }
}
