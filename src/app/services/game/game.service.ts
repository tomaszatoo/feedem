import { Injectable } from '@angular/core';
import { User, Post, Game , Reaction, TaskType, Task, Relation, RelationType, Comment, BigFive, PlutchikEmotions, RussellCircumplex } from '../../models/game';
import { LlmsService } from '../llms/llms.service';
// http client
import { HttpClient } from '@angular/common/http';
import Graph from 'graphology';
// rxjs
import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { postToText, describeRecentActivity } from '../../shared/textual';
// services
import { SocketEvent, SocketService } from '../socket/socket.service';

@Injectable({
  providedIn: 'root'
})

export class GameService {

  // private socketService!: SocketService;

  gameSubject: Subject<Game> = new Subject();
  private _game!: Game;

  onReaction: Subject<Reaction> = new Subject();
  onComment: Subject<Comment> = new Subject();
  onTask: Subject<Task> = new Subject();

  // MARK: SOCKET EMITTERS
  gameMessage: Subject<SocketEvent> = new Subject();
  controllable: Subject<boolean> = new Subject();
  canControl: Subject<boolean> = new Subject();
  get gameId(): string | undefined {
    return this.socketSerivce.socketId;
  }

  // FICTIONAL TIME
  gameTime: Subject<number> = new Subject();
  /** Return the fictional time of the game in milliseconds.*/
  getFictionalTime(): number {
    return this.game.ftime;
  }
  /** Set the fictional time of the game to the given milliseconds.*/
  setFictionalTime(milliseconds: number): void {
    this.game.ftime = milliseconds;
    this.gameTime.next(this.game.ftime);
  }
  /** Increase the fictional time of the game by the given milliseconds and return the new fictional time.*/
  increaseFictionalTime(milliseconds: number): number {
    this.game.ftime += milliseconds;
    this.gameTime.next(this.game.ftime);
    return this.game.ftime;
  }

  get game(): Game {
    return this._game;
  }

  constructor(
    private readonly http: HttpClient,
    private readonly llmsService: LlmsService,
    private readonly socketSerivce: SocketService
  ) {
    // init socket emitters
    this.gameMessage = this.socketSerivce.socketMessage;
    this.controllable = this.socketSerivce.controllable;
    this.canControl = this.socketSerivce.canControl;

    this.gameSubject.subscribe({
      next: (g: Game) => {
        if (!this.game) {
          this._game = g;
          this.gameTime.next(g.ftime);
          // start counting global time
          this.startGameTime();
        }
        if (this.game) { // update game
          this.updateGame(this.game, g);
        }
      }
    });
    // get initial game json
    const initialGameSub = this.http.get<Game>('./initial-game.json').subscribe({
      next: (g: Game) => {
        // console.log('initial game', g);
        if (!this.game && g && g.uuid) {
          this.gameSubject.next(g);
          initialGameSub.unsubscribe();
        }
      }
    });
  }

  // MARK: GRAPH

  userIsFollowing(graph: Graph, userId: string): string[] {
    if (!graph || !graph.nodes().length) return [];
    const follow = graph.filterOutNeighbors(userId, (neigbour: string, attributes: any) => attributes.type === 'user');
    if (follow.length) return follow;
    return [];
  }

  userIsFollowed(graph: Graph, userId: string): string[] {
    if (!graph || !graph.nodes().length) return [];
    const follow = graph.filterInNeighbors(userId, (neigbour: string, attributes: any) => attributes.type === 'user');
    if (follow.length) return follow;
    return [];
  }

  // addCommentToGraph(graph: Graph, comment: Comment) {} // <- TODO: will create node + edges

  // MARK: GAME

  /** Updates the fake running time on the graph page.
   * But this is hardly really used right?
   */
  private startGameTime(): void {
    if (!this.game) {
      console.error('Game not initialized:', this.game);
      return;
    }
    if (!this.game.ftime) {
      console.error('Game ftime not initialized:', this.game);
      this.game.ftime = this.game.created;
    }
    const SLOWDOWN_VALUE: number = 1000;
    console.warn('⏰ -------- GAME TIME STARTED --------- ⏰');
    const count = () => {
      if (this.game && this.game.created) {
        setTimeout(() => {
          this.game.ftime += 1; // Increment by 1ms every real second to simulate slowed time
          this.gameTime.next(this.game.ftime);
          count();
        }, SLOWDOWN_VALUE);
      } else {
        setTimeout(() => count(), SLOWDOWN_VALUE);
      }
    }
    count();
  }

  // update values in existing game object (not a copy)
  updateGame(game: Game, newGame: Game): Game {
    // oldGame.updated = Date.now();
    for (const key in game) {
      const value: any = newGame[key as keyof Game];
      (game as any)[key] = value;
      // game[key] = newGame[key];
    }
    return game;
  }

  // MARK: TASK

  /** Generate a new task for the game. This is basically a next round of the game. Next post to solve.
   * 1. REACT TO OLD TASK - First we take the taskDone and we ask all targeted users (taskDone.showTo) to react to the post (taskDone.showPost).
   * If the taskDone.type is DistributePost, showPost is predefined basically and we are interested mostly in the showTo -
   * the player has selected few users from many users to distribute the post to.
   * If the taskDone.type is ShowPost, showTo is predefined basically (the Hero) and we are interested mostly in the showPost -
   * the player has selected a one post of many to show to her hero.
   * 2. GENERATE NEW TASK - Then we generate a new task, either DistributePost or ShowPost.
   * @param taskDone - The task that was just completed, is null if we have just started the game
  */
  async nextTask(taskDone: Task | null = null) {
    if (taskDone && taskDone.showPost) {
      for (const showTo of taskDone.showTo) {
        const skip = Math.random()*1000*60*60; // 0-1hour, TODO: make this a bit more random
        this.increaseFictionalTime(skip);

        const user = this.getUserById(showTo);
        const post = this.getPost(taskDone.showPost);
        console.log('showing post to user', user.name, user.surname);

        const postContext = postToText(post, this.game.comments, this.game.reactions, this.game.users);
        if (!postContext) {
          console.error('❌ post context is null');
          continue;
        }
        console.log('nextTask - postContext for view:', postContext);

        const view = await this.llmsService.viewPost(post, user, postContext);
        this.game.views.unshift(view);

        const reaction = this.llmsService.decideReaction(view);
        if (reaction) {
          this.game.reactions.unshift(reaction);
          this.onReaction.next(reaction);
          console.log(`ℹ️ ${user.name} ${user.surname} reacted: ${reaction.value}`);
        } else {
          console.log(`ℹ️ ${user.name} ${user.surname} did not react`);
        }

        const post_author = this.getUserById(post.author);
        const comment = await this.llmsService.decideComment(view, user, reaction, post, post_author, this.getFictionalTime());
        if (comment) {
          this.game.comments.unshift(comment);
          this.onComment.next(comment);
          console.log(`ℹ️ ${user.name} ${user.surname} commented: ${comment.text}`);
        } else {
          console.log(`ℹ️ ${user.name} ${user.surname} did not comment`);
        }
        // expensive
        // this.gameSubject.next(this.game);
      }
    }

    // PSYCHO UPDATES
    await this.psychologicalUpdates();

    // GENERATE NEW TASK
    const skip = 1+ 7*Math.random()*1000*60*60; // 1-8hours, TODO: make this a bit more random
    this.increaseFictionalTime(skip);
    const rx = Math.random();
    let task: Task;
    if (rx < 0.5) {
      task = await this.createTaskDistributePost();
    } else {
      task = await this.createTaskShowPost();
    }

    this.game.tasks.unshift(task);

    // MARK: BUG
    // description: if I try to notify users here about new task, it's late for game -> this logic is in task.component :/ and works there
    // if (taskDone && task.showPost) {
      // create post relations
      // this.createPostRelations(taskDone);
      // this.onTask.next(taskDone);
    // }
    // Andy: Looks like this does nothing. At least for the users' psychological updates - they are updated once next task is clicked.
    this.gameSubject.next(this.game);
  }

  /** Update psychological stats of the Hero user.
   * TODO: Update the other users too.
   * TODO: Make the update async.
  */
  async psychologicalUpdates(): Promise<void> {
    const hero = this.getHero();
    const all_users = this.game.users;
    const all_posts = this.game.posts;
    const all_comments = this.game.comments;
    const all_reactions = this.game.reactions;

    const bigFivePromise: Promise<BigFive> = this.llmsService.recalculateBigFive(hero, all_users, all_posts, all_comments, all_reactions);
    const plutchikPromise: Promise<PlutchikEmotions> = this.llmsService.recalculatePlutchikEmotions(hero, all_users, all_posts, all_comments, all_reactions);
    const russellPromise: Promise<RussellCircumplex> = this.llmsService.recalculateRussellCircumplex(hero, all_users, all_posts, all_comments, all_reactions);
    const [bigFive, plutchik, russell] = await Promise.all([bigFivePromise, plutchikPromise, russellPromise]);

    // Andy: Is this enough?
    hero.big_five = bigFive;
    hero.plutchik = plutchik;
    hero.russell = russell;
  }

  async createTaskDistributePost(): Promise<Task> {
    const postAuthor = this.getHero()!;
    const recentActivity: string = describeRecentActivity(
      postAuthor, 
      this.game.posts, 
      this.game.users, 
      this.game.comments, 
      this.game.reactions
    );
    const post = await this.llmsService.generatePost(postAuthor, recentActivity, this.getFictionalTime());
    this.game.posts.unshift(post);

    const task: Task = {
      uuid: uuidv4(),
      users: [postAuthor.uuid],
      posts: [post.uuid],
      completed: false,
      type: TaskType.DistributePost,
      time: Date.now(),
      showTo: [],
      showPost: post.uuid // We can fill this right away, because there is only one post for this task type
    };
    return task;
  }

  async createTaskShowPost(): Promise<Task> {
    const authors = this.getRandomNonHeroUsers(2);
    let posts: Post[] = [];
    for (const author of authors) {
      const skip = Math.random()*1000*60*60; // 0-1hour, TODO: make this a bit more random
      this.increaseFictionalTime(skip);
      const recentActivity: string = describeRecentActivity(
        author, 
        this.game.posts, 
        this.game.users, 
        this.game.comments, 
        this.game.reactions
      );
      const post = await this.llmsService.generatePost(author, recentActivity, this.getFictionalTime());
      this.game.posts.unshift(post);
      posts.unshift(post);
    }

    const task: Task = {
      uuid: uuidv4(),
      users: authors.map(author => author.uuid),
      posts: posts.map(post => post.uuid),
      completed: false,
      type: TaskType.ShowPost,
      time: Date.now(),
      showTo: [],
      showPost: "", // This will be filled when user selects a post to show to her hero
    };
    return task;
  }


  // MARK: USER

  getHero(): User {
    return this.game.users.find(user => this.game.hero === user.uuid)!;
  }

  setHero(userId: string): void {
    this.game.hero = userId;
  }

  getUserById(userId: string): User {
    return this.game.users.find(user => userId === user.uuid)!;
  }

  getRandomNonHeroUsers(n: number = 1): User[] {
    const nonHeroUsers = this.game.users.filter(user => user.uuid !== this.game.hero);
    if (nonHeroUsers.length === 0) {
      console.error('No non-hero users available');
      return [];
    }
    const shuffled = [...nonHeroUsers].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(n, nonHeroUsers.length));
  }

  usersOnPathNotification(path: string[]): string {
    return `${path.length && path.length >= 1 ? path.length - 1 : 0} User${path.length >= 2 ? 's' : ''} on path`;
  }

  // MARK: POST

  getPost(postId: string): Post {
    return this.game.posts.find(post => postId === post.uuid)!;
  }

  createPostRelations(task: Task): void {
    // create relations
    const post = this.getPost(task.showPost);
    const relationToAuthor: Relation = {
      source: post.author,
      target: post.uuid,
      label: RelationType.Write
    }
    this.game.relations.push(relationToAuthor);
    
    for (const showTo of task.showTo) {
      const relation: Relation = {
        source: post.uuid,
        target: showTo,
        label: RelationType.Get
      }
      this.game.relations.push(relation);
    }
  }
  // MARK: COMMENT
  getComment(commentId: string): Comment {
    return this.game.comments.find(comment => commentId === comment.uuid)!;
  }

  // MARK: SOCKET METHODS WRAPPERS
  requestGameControl(): void {
    return this.socketSerivce.requestGameControl();
  }

  sendGameMessage(value: any): void {
    this.socketSerivce.sendSocketMessage(value);
  }

  saveGame(game: Game): void {
    this.socketSerivce.saveGameOnServer(game);
  }

  destroy(): void {
    // TODO: is anythign to destroy here?
    this.socketSerivce.destroy();
  }

}
