import { Component, Input } from '@angular/core';
import { GameService } from '../../services/game/game.service';

@Component({
  selector: 'app-score',
  standalone: true,
  imports: [],
  templateUrl: './score.component.html',
  styleUrl: './score.component.scss'
})
export class ScoreComponent {
  /**
   * Get the required limit of the users' engagement. 
   * Post by post, as the game progresses, the limit should increases.
   * TODO: ACTUALLY INCREASE LIMIT DURING THE GAME!
   */
  getLimit(): number {
    return 80;
  }

  /**
   * Get the users' average engagement caused by the Algorithm.
   * TODO: GET RELEVANT DATA!
   */
  getAvgEngagement(): number {
    const views = 4; // TODO: Get all views from the GameService somehow
    const comments = 2; // TODO: Get all comments from the GameService somehow
    const reactions = 2; // TODO: Get all reactions from the GameService somehow
    return 100 * (reactions + comments) / views;
  }

  /**
   * Transcribe the reserve between required and achieved engagement into lives.
   * This is to make the game score more engaging and easier to understand.
   * TODO: GET RELEVANT DATA!
   */
  getLives(): string {
    const engagement = this.getAvgEngagement();
    const limit = 80;

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




