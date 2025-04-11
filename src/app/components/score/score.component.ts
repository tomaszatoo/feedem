import { Component } from '@angular/core';
import { GameService } from '../../services/game/game.service';
import { Subscription } from 'rxjs';
import { Game } from '../../models/game';
import { getLimit, getAvgEngagement } from '../../shared/utils';

@Component({
  selector: 'app-score',
  standalone: true,
  imports: [],
  templateUrl: './score.component.html',
  styleUrl: './score.component.scss'
})
export class ScoreComponent {
  gameData?: Game;
  private gameSub!: Subscription;
  constructor(private gameService: GameService) {}

  ngOnInit(): void {
    this.gameSub = this.gameService.game.subscribe((gameDataUpdate: Game) => {
      this.gameData = gameDataUpdate;
    });
  }

  ngOnDestroy(): void {
    this.gameSub.unsubscribe();
  }

  getLimit(): number {
    return getLimit(this.gameData?.tasks.length || 0);
  }

  getAvgEngagement(): number {
    const views = this.gameData?.views.length || 0;
    const comments = this.gameData?.comments.length || 0;
    const reactions = this.gameData?.reactions.length || 0;
    return getAvgEngagement(views, comments, reactions);
  }

  /**
   * Transcribe the reserve between required and achieved engagement into lives.
   * This is to make the game score more engaging and easier to understand.
   */
  getLives(): string {
    const engagement = this.getAvgEngagement();
    const limit = this.getLimit();

    const maxDiff = 200 - limit;
    const difference = engagement - limit;
    const percentage = (difference / maxDiff) * 100;

    if (percentage > 40) return "♡♡♡♡♡";
    if (percentage > 20) return "♡♡♡♡";
    if (percentage > 15) return "♡♡♡";
    if (percentage > 5) return "♡♡";
    if (percentage > 0) return "♡";
    return "💀";
  }
}




