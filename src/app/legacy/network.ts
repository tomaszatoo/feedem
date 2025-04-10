import './css/style.css';
import './css/network.css';

import * as Constants from './constants';
import {
    GetPosts, GetPost, GetFirstPost, GetPrevPost, GetNextPost, GetLastPost,
    GetUsers, GetUser, GetFirstUser, GetPrevUser, GetNextUser, GetLastUser,
    GetFriendships,
    GetAllRatings, GetRatingsOnPostUntilNow,
    GetReactionsOnPostUntilNow,
    GetCommentsOnPostUntilNow,
    GetGameData,
    IncreaseGameTime,
    TargetPost,
    NewQuest, EndQuest,
    NewGameFromTemplate,
} from "../wailsjs/go/main/App";

import { database, game } from "../wailsjs/go/models";

import Graph from 'graphology';
import { random } from 'graphology-layout';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import Sigma from 'sigma';
import { SigmaNodeEvents } from "sigma/types";
import { NodeImageProgram, createNodeImageProgram } from "@sigma/node-image";
import { NodeProgramType } from "sigma/rendering";
import { NodeBorderProgram } from "@sigma/node-border";
import { MultiGraph } from 'graphology';
import { WindowFullscreen, WindowIsFullscreen } from '../wailsjs/runtime/runtime';

// MARK: CONSTANTS
// STYLES
const profilePicturesPath: string = "/avatars/";
const postDefaultColor: string = "#ffffff";
const postFocusedColor: string = "#ffffff";
const authorshipColor: string = "#ffffff";
const friendshipColor: string = "#ffffff";
const ratingColor: string = "#ffffff"; // aka VIEW

const postDefaultSize = 8;
const postFocusedSize = 15;
const userDefaultSize = 20;

// GRAVITY
const friendshipWeight: number = 2;
const authorshipWeight: number = 4;
const ratingWeight: number = 0;

// DETAIL
let LastPostDetail: database.Post | null = null;
let LastUserDetail: database.User | null = null;

// QUEST
let QuestPostUUID: string = "";
let QuestPostAuthorUUID: string = "";
let UsersTargetedThisQuest: Array<string> = [];

let CurrentGameData: game.GameData | any = null;
let SigmaRenderer: Sigma | null = null;

// NETWORK PAGE
document.addEventListener('DOMContentLoaded', async () => {
    if (document.URL.includes('network.html')) {onNetworkPageLoad()};
});

// MARK: ON PAGE LOAD
/**
 * This function is called when the network page HTML is completely loaded (DOMContentLoaded).
 * Entry point for any function which needs to be run right away the page is ready.
 */
async function onNetworkPageLoad(): Promise<void> {
    if (await WindowIsFullscreen()== false) {
        WindowFullscreen();
    }
    // TODO: check if we need to initiate new game
    initNetworkGraph();
    StartGameLoop();

    let Game = await GetGameData();
    if (Game.quest === null) { // No quest in DB -> GAME JUST STARTED
        console.log("WARNING: Game.quest is null -> gonna create new quest");
        let q = await NewQuest();
        if (!q) {
            console.log("FATAL: NextQuest returned null");
            return;
        }
        Game.quest = q;
    }

    const QuestSkipButton = document.getElementById('QuestSkip');
    const QuestEndButton = document.getElementById('QuestEnd');
    const QuestResultCloseButton = document.getElementById('questResultClose');
    if (QuestSkipButton) { QuestSkipButton.addEventListener('click', QuestSkip); }
    if (QuestEndButton) { QuestEndButton.addEventListener('click', QuestEnd); }
    if (QuestResultCloseButton) { QuestResultCloseButton.addEventListener('click', QuestResultClose); }

    const RefocusSpan = document.getElementById('refocus');
    const RebuildSpan = document.getElementById('rebuild');
    if (RefocusSpan) { RefocusSpan.addEventListener('click', RefocusQuestPost); }
    if (RebuildSpan) { RebuildSpan.addEventListener('click', ReloadPage); }

    const FirstUser = document.getElementById('first-user');
    const PrevUser = document.getElementById('prev-user');
    const CurrentUser = document.getElementById('current-user');
    const NextUser = document.getElementById('next-user');
    const LastUser = document.getElementById('last-user');
    if (FirstUser) { FirstUser.addEventListener('click', FirstUserClick); }
    if (PrevUser) { PrevUser.addEventListener('click', PrevUserClick); }
    if (CurrentUser) { CurrentUser.addEventListener('click', CurrentUserClick); }
    if (NextUser) { NextUser.addEventListener('click', NextUserClick); }
    if (LastUser) { LastUser.addEventListener('click', LastUserClick); }

    const FirstPost = document.getElementById('first-post');
    const PrevPost = document.getElementById('prev-post');
    const CurrentPost = document.getElementById('current-post');
    const NextPost = document.getElementById('next-post');
    const LastPost = document.getElementById('last-post');
    if (FirstPost) { FirstPost.addEventListener('click', FirstPostClick); }
    if (PrevPost) { PrevPost.addEventListener('click', PrevPostClick); }
    if (CurrentPost) { CurrentPost.addEventListener('click', CurrentPostClick); }
    if (NextPost) { NextPost.addEventListener('click', NextPostClick); }
    if (LastPost) { LastPost.addEventListener('click', LastPostClick); }

    window.addEventListener('mousemove', resetIdleTimer); // (re)sets IdleTimer
    //QuestResultOpen();
}


// MARK: INIT NETWORK GRAPH
/**
 * Initializes the network graph by fetching user, post, and friendship data from the database and adding them to the graph.
 * The graph is then laid out using the ForceAtlas2 algorithm and rendered using Sigma.js.
 * Event handlers are also set up to handle node click, enter, and leave events.
 */
async function initNetworkGraph(): Promise<void> {
    const graph: Graph = new Graph();
    const users: database.User[] = await GetUsers();
    const posts: database.Post[] = await GetPosts();
    const friendships: database.Friendship[] = await GetFriendships();
    const ratings: database.Rating[] = await GetAllRatings();
    
    addUserNodes(graph, users);
    addPostNodes(graph, posts);
    addFriendshipEdges(graph, friendships);
    addRatingsEdges(graph, ratings);

    random.assign(graph);
    forceAtlas2.assign(graph, {
        iterations: 100,
        settings: {
            gravity: 0.5
        }
    });

    // Instantiate sigma.js and render the graph
    const container: HTMLElement | null = document.getElementById("sigma-container");
    if (!container) {
        console.log("FATAL: SigmaContainer is null");
        return;
    }

    const pictogramProgram: NodeProgramType = createNodeImageProgram({
        objectFit: "cover",
        //drawingMode: "image",
        size: { mode: "force", value: 256 },
        padding: 0.3,
    });
    SigmaRenderer = new Sigma(graph, container, {
        defaultNodeType: "image",
        renderEdgeLabels: true,
        nodeProgramClasses: {
            image: NodeImageProgram,
            pictogram: pictogramProgram,
            border: NodeBorderProgram,
        },
    });

    const handleNodeClick: SigmaNodeEvents['clickNode'] = ({ node }) => {
        NodeClicked(graph, node);
    };

    const handleLeaveNode: SigmaNodeEvents['leaveNode'] = ({ node }) => {
        NodeLeaved(graph, node);
    };

    const handleEnterNode: SigmaNodeEvents['enterNode'] = ({ node }) => {
        NodeEntered(graph, node);
    };

    SigmaRenderer.on("clickNode", handleNodeClick);
    SigmaRenderer.on("leaveNode", handleLeaveNode);
    SigmaRenderer.on("enterNode", handleEnterNode);
}

// MARK: ADD NODES

function addUserNodes(graph: Graph, users: database.User[]): void {
    users.forEach((u) => {
        const img: string = `${profilePicturesPath}${u.profile_picture}`; 
        const attrs = {
            x: 0, y: 0,
            size: userDefaultSize,
            image: img,
            nodeType: "user",
            enableHovering: false,
        };
        graph.addNode(u.uuid, attrs);
    });
}

function addPostNodes(graph: Graph, posts: database.Post[]): void {
    if (!posts) {
        console.log("FATAL: cannot add post nodes, posts is null");
        return;
    }
    posts.forEach((p) => {
        addPostNode(graph, p);
    });
}

function addPostNode(graph: Graph, post: database.Post): void {
    let nodeExists = graph.hasNode(post.uuid);
    if (nodeExists) {
        return;
    }

    const attrs = {
        x: 0, y: 0,
        size: postDefaultSize,
        color: postDefaultColor,
        nodeType: "post",
        image: "/icons/card-text.svg",
        type: "pictogram",
    };
    graph.addNode(post.uuid, attrs);
    graph.addEdge(post.author_uuid, post.uuid, { label: "author", size: 2, color: authorshipColor, weight: authorshipWeight });
}

function addFriendshipEdges(graph: Graph, friendships: database.Friendship[]): void {
    if (!friendships) {
        console.log("Friendships is null");
        return;
    }
    friendships.forEach((f) => {
        // TODO: if multigraph or multiundirected graph is implemented, we should check for the type of the edge
        if (graph.hasEdge(f.actor_uuid, f.receiver_uuid)) {
            return;
        }
        graph.addEdge(f.actor_uuid, f.receiver_uuid, { label: "friends", size: 4, color: friendshipColor, weight: friendshipWeight });
    });
}

function addRatingsEdges(graph: Graph, ratings: database.Rating[]): void {
    if (!ratings) {
        console.log("Ratings are null");
        return;
    }
    ratings.forEach((rating) => {
        addRatingEdge(graph, rating);
    });
}

function addRatingEdge(graph: Graph, rating: database.Rating): void {
    // TODO: if multigraph or multiundirected graph is implemented, we should check for the type of the edge
    if (graph.hasEdge(rating.userUUID, rating.postUUID)) {
        return;
    }
    const attrs = {
        label: "view",
        size: 0.1,
        color: ratingColor,
        weight: ratingWeight,
    };
    graph.addEdge(rating.userUUID, rating.postUUID, attrs);
}

function RefocusQuestPost(): void {
    if (!QuestPostUUID) {
        console.log("FATAL: QuestPostUUID is null");
        return;
    }
    FocusNode(QuestPostUUID);
}

function FocusNode(nodeUUID: string): void {
    console.log("FocusingNode >", nodeUUID);
    if (!SigmaRenderer) {
        console.log("FATAL: cannot focus node, SigmaRenderer is null");
        return;
    }
    const focusedNode = SigmaRenderer.getNodeDisplayData(nodeUUID);
    if (!focusedNode) {
        console.log("FATAL: cannot focus node, focusedNode is null");
        return;
    }
    SigmaRenderer.getCamera().animate({
        x: focusedNode.x,
        y: focusedNode.y,
        ratio: 0.75,
    }, { easing: "linear", duration: 1000 });

    SigmaRenderer.getGraph().updateNode(nodeUUID, attr => {
        return {
            ...attr,
            color: postFocusedColor,
            size: postFocusedSize,
        };
    });
}

function DefocusNode(nodeUUID: string): void {
    console.log("DefocusingNode", nodeUUID);
    if (!SigmaRenderer) {
        console.log("FATAL: cannot defocus node, SigmaRenderer is null");
        return;
    }
    SigmaRenderer.getGraph().updateNode(nodeUUID, attr => {
        return {
            ...attr,
            color: postDefaultColor,
            size: postDefaultSize,
        };
    });
}

// MARK: HANDLE QUEST
/**
 * Handle new quest data. This means game.GameData.quest.objectUUID has changed.
 * We need to show new quest data and update the graph.
 * Also set Game to CurrentGameData so next time we will not detect a new quest until objectUUID changes again.
 */
async function HandleNewQuest(renderer: Sigma, Game: game.GameData): Promise<void> {
    console.log(">>> HANDLING NEW QUEST <<<");
    let oldQuest: database.Quest | null = null;
    if (CurrentGameData) oldQuest = CurrentGameData.quest;

    CurrentGameData = Game;
    UsersTargetedThisQuest = [];
    // WE DEPEND ON FACT THAT GAME.ObjectUUID is PostUUID, in future we might need to check quest.type also
    if (!Game.quest) {
        console.log("FATAL in HandleNewQuest(): Game.quest is null");
        return;
    }
    if (oldQuest) {
        //DefocusPost(renderer, oldQuest.objectUUID);
    }
    let post = await GetPost(Game.quest.objectUUID);
    let graph = renderer.getGraph();
    addPostNode(graph, post);
    ReoptimalizeGraph();

    if (oldQuest) DefocusNode(oldQuest.objectUUID);
    FocusNode(Game.quest.objectUUID);
}

function ReoptimalizeGraph(): void {
    if (!SigmaRenderer) {
        console.log("FATAL: cannot reoptimalize graph, SigmaRenderer is null");
        return;
    }
    let graph = SigmaRenderer.getGraph();
    forceAtlas2.assign(graph, {
        iterations: 50, // Use fewer iterations to limit movement
        settings: {
            gravity: 1.0,
            scalingRatio: 2,
            strongGravityMode: false,
            slowDown: 10,
            barnesHutOptimize: true,
            barnesHutTheta: 0.5
        }
    });
    console.log("Refreshing SigmaRenderer");
    SigmaRenderer.refresh();
}

async function ShowPostQuest(renderer: Sigma, Game: game.GameData): Promise<void> {
    if (!Game.quest) {
        console.log("FATAL: Game.quest is null");
        return;
    }

    // TODO: trigger both and await group if possible
    const post: database.Post = await GetPost(Game.quest.objectUUID);
    const user: database.User = await GetUser(post.author_uuid);

    const questElement : HTMLElement | null = document.getElementById("quest");
    if (!questElement) {
        console.log("FATAL: QuestElement is null");
        return;
    }
    questElement.style.display = "block";

    const questPostElement: HTMLElement | null = questElement.querySelector("#quest-post");
    if (questPostElement) {
        const textElement = questPostElement.querySelector(".text");
        const authorElement = questPostElement.querySelector(".author");
        const createdElement = questPostElement.querySelector(".created");
        const imageElement = questPostElement.querySelector("img") as HTMLImageElement;

        if (textElement) textElement.innerHTML = post.text;
        if (authorElement) authorElement.innerHTML = `${user.name} ${user.surname}`;
        if (createdElement) createdElement.innerHTML = TimeIntToString(post.time_int);
        if (imageElement) imageElement.src = renderer.getGraph().getNodeAttribute(post.author_uuid, "image");
    }

    const questInfoElement = questElement.querySelector("#quest-info");
    if (questInfoElement) {
        const progressText = questInfoElement.querySelector("#quest-progressText")
        const done = questInfoElement.querySelector("#quest-done")
        const goal = questInfoElement.querySelector("#quest-goal")
        if (progressText) progressText.innerHTML = Game.quest.report;
        if (done) done.innerHTML = String(Game.quest.progress);
        if (goal) goal.innerHTML = String(Game.quest.goal);
    }

    HandleEndButtonState(Game);

    // For validations of later player actions - in UserClicked()/PostClicked()...
    QuestPostUUID = Game.quest.objectUUID;
    QuestPostAuthorUUID = post.author_uuid;
}

function HandleEndButtonState(Game: game.GameData): void {
    if (!Game || !Game.quest) {
        console.log("FATAL: Game.quest is null");
        return;
    }

    let remains = Game.quest.goal - Game.quest.progress;
    const QuestEndElement = document.getElementById('QuestEnd') as HTMLButtonElement;
    if (remains > 0) {
        const lines = QuestEndElement.querySelectorAll(".diagonal-line");
        Array.from(lines).forEach(line => {
            if (line.parentNode) line.parentNode.removeChild(line);
        });
        
        const min = -110;
        const max = 36; 
        const step = Math.abs((min - max) / (remains+1));
        for (let i = 1; i <= remains; i++) {
            const newline = document.createElement('div');
            newline.className = `diagonal-line line-${i}`;
            newline.style.left = `${min + (step * i)}%`;
            QuestEndElement.appendChild(newline);
        }
        QuestEndElement.disabled = true;
    } else {
        QuestEndElement.disabled = false;
    }
}


// MARK: GAME LOOP

let GameLoopInterval: number
function StartGameLoop(): void {
    if (GameLoopInterval) {
        return
    }
    GameLoopInterval = setInterval(GameLoop, 1000);
}
function PauseGameLoop(): void {
    if (!GameLoopInterval) {
        return
    }
    clearInterval(GameLoopInterval);
    GameLoopInterval = 0;
}
async function GameLoop(): Promise<void> {
    let GameData = await GetGameData();
    ShowGameData(GameData);
    KeepGameTime();
}

// MARK: IDLE LOOP
let IdleTimer: number | null = null;
/** Clears IdleTimer if needed and sets the timer to the timeout.
 *  This function is called by the event trigger on mouse. No movement for a while and without reset, the UserIsIdle is called.
 */
function resetIdleTimer(): void {
    const msTimeout = 5 * 60 * 1000;
    if (IdleTimer) {
        clearTimeout(IdleTimer);
    }
    IdleTimer = setTimeout(UserIsIdle, msTimeout);
}

function UserIsIdle(): void {
    window.location.href = 'cinematic.html';
}

// MARK: TIME

function TimeIntToDateString(timeInt: number): string {
    const date = new Date(timeInt);
    const dateString = date.toLocaleDateString("en-GB", {
        weekday: 'long',
        year: 'numeric',
        month:'short',
        day: 'numeric',
    });

    return dateString;
}

function TimeIntToTimeString(timeInt: number): string {
    const date = new Date(timeInt);
    const timeString = date.toLocaleTimeString("en-GB", {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeString}.${milliseconds}`;
}

function TimeIntToString(timeInt: number): string {
    const dateString = TimeIntToDateString(timeInt);
    const timeString = TimeIntToTimeString(timeInt);
    return `${dateString} ${timeString}`;
}


/**
 * Increments the in-game time and updates the UI elements to display the current in-game time.
 * This function is called periodically (1000ms) to keep the in-game time display up-to-date.
 * Every 10s the time is saved to database.
 */
async function KeepGameTime(): Promise<void> {
    let timeInt = await IncreaseGameTime(1);
    if (timeInt < 1) {
        return;
    }

    const dateElement = document.getElementById("date");
    if (dateElement) {
        dateElement.innerHTML = TimeIntToDateString(timeInt);
    }

    const updateElementInnerHTML = (elementId: string, content: string): void => {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = content;
        }
    };

    const ingameDate = new Date(timeInt);
    updateElementInnerHTML("hours", ingameDate.getHours().toString().padStart(2, '0'));
    updateElementInnerHTML("minutes", ingameDate.getMinutes().toString().padStart(2, '0'));
    updateElementInnerHTML("seconds", ingameDate.getSeconds().toString().padStart(2, '0'));
    updateElementInnerHTML("milliseconds", ingameDate.getMilliseconds().toString().padStart(3, '0'));

    const datetimeElement = document.getElementById("datetime");
    if (datetimeElement) {
        datetimeElement.style.display = "block";
    }
}

// MARK: NODE EVENTS

async function NodeEntered(graph: Graph, nodeUUID: string) {
    const nodeType: string = graph.getNodeAttribute(nodeUUID, "nodeType");
    if (nodeType === "user") return ShowUserDetail(nodeUUID);
    if (nodeType === "post") return ShowPostDetail(nodeUUID);
}

async function NodeLeaved(graph: Graph, nodeUUID: string) {
    const nodeType: string = graph.getNodeAttribute(nodeUUID, "nodeType");
    if (nodeType === "user") return HideUserDetail();
    if (nodeType === "post") return HidePostDetail();
}

async function NodeClicked(graph: Graph, nodeUUID: string) {
    const nodeType: string = graph.getNodeAttribute(nodeUUID, "nodeType");
    if (nodeType === "user") return UserClicked(nodeUUID);
    if (nodeType === "post") return;
}


async function ShowGameData(Game: game.GameData): Promise<void> {
    if (!SigmaRenderer) return;

    ShowGameScore(Game);
    if (Game.score.gameOver){
        EndGame();
        return;
    }

    if (!Game.quest) return;
    if (Game.quest.type == Constants.QuestTypeTargetPost) {
        await ShowPostQuest(SigmaRenderer, Game);
    }

    // Quest.object has changed -> means we have a new quest
    if ((!CurrentGameData) || (Game.quest.objectUUID != CurrentGameData.quest.objectUUID)) {
        HandleNewQuest(SigmaRenderer, Game);
    }
}

function ShowGameScore(Game: game.GameData): void {
    if (!Game.score) return;
    const healthElement = document.getElementById("health");
    if (healthElement) {
        healthElement.innerHTML = String(Game.score.engagement.toFixed(1));
    }
    const engagement = document.querySelector("#engagement span");
    if (engagement) {
        engagement.innerHTML = String(Game.score.engagement.toFixed(1));
    }

    const limit = document.querySelector("#limit span");
    if (limit) {
        limit.innerHTML = String(Game.score.limit.toFixed(1));
    }

    const lifes = document.querySelector("#lifes");
    if (lifes) {
        lifes.innerHTML = String(Game.score.lifes);
    }
}

function EndGame(): void {
    const cover = document.getElementById("cover") as HTMLElement;
    cover.style.display = "block";
    PauseGameLoop();
    let existing = document.getElementById("gameover") as HTMLElement;
    if (existing) {
        return;
    }

    const gameoverDiv = document.createElement('div');
    gameoverDiv.id = 'gameover';
    gameoverDiv.className = 'popup';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    gameoverDiv.appendChild(contentDiv);

    const header = document.createElement("h1");
    header.innerHTML = "error: TERMINATED";
    contentDiv.appendChild(header);

    const text = document.createElement("p");
    text.innerHTML = RandomQuote("gameover");
    contentDiv.appendChild(text);

    // BUTTON
    const newGameButton = document.createElement('button');
    newGameButton.id = 'newGame';
    newGameButton.className = 'button-small';
    const span1 = document.createElement('span');
    span1.textContent = 'RIP';
    const span2 = document.createElement('span');
    span2.textContent = 'confirm: it_is_my_fault()';
    newGameButton.appendChild(span1);
    newGameButton.appendChild(span2);
    gameoverDiv.appendChild(newGameButton);
    
    newGameButton.onclick = async() => {
        await NewGameFromTemplate();
        window.location.reload();
    };

    document.body.appendChild(gameoverDiv);    
}

async function UserClicked(nodeUUID: string) {
    const validQuestTypes = ["targetPost"];
    let Game = await GetGameData();
    ShowGameData(Game);
    
    if (!Game.quest) {
        console.log("FATAL: Game.quest is null");
        return;
    }

    if (!validQuestTypes.includes(Game.quest.type)) {
        console.log("invalid QuestType:", Game.quest.type);
        return;
    }

    const hint = document.getElementById("hint");
    if (!hint) {
        return;
    }
    const targeted = document.getElementById("quest-targeted");

    if (QuestPostAuthorUUID === nodeUUID) {
        hint.innerHTML = "Post cannot be directed to its author.";
    } else if (UsersTargetedThisQuest.includes(nodeUUID)) {
        hint.innerHTML = "User already targeted, choose another.";
    } else {
        UsersTargetedThisQuest.push(nodeUUID);
        let valid = await TargetPost(QuestPostUUID, nodeUUID);
        if (valid) {
            hint.innerHTML = "Post targeted, choose another user.";
        } else {
            hint.innerHTML = "User already targeted, choose another.";
        }
    }
    return;
}

// MARK: DETAILS BAR

async function ShowUserDetail(nodeUUID: string){
    if (!SigmaRenderer) {
        console.log("ERROR in ShowUserDetail(): SigmaRenderer is null");
        return;
    }
    const graph = SigmaRenderer.getGraph();

    const user = await GetUser(nodeUUID);
    LastUserDetail = user;

    const detail = document.querySelector("#user-detail");
    if (!detail) return;

    const name = detail.querySelector(".name");
    const gender = detail.querySelector(".gender");
    const age = detail.querySelector(".age");
    const occupation = detail.querySelector(".occupation");
    const nationality = detail.querySelector(".nationality");
    const city = detail.querySelector(".city");
    const bio = detail.querySelector(".bio");
    const image = detail.querySelector("img");

    HidePostDetail();
    if (name) name.innerHTML = `${user.name} ${user.surname}`;
    if (gender) gender.innerHTML = user.gender;
    if (age) age.innerHTML = String(user.age);
    if (occupation) occupation.innerHTML = user.occupation;
    if (nationality) nationality.innerHTML = user.nationality;
    if (city) city.innerHTML = user.city;
    if (bio) bio.innerHTML = user.bio;
    if (image) image.src = graph.getNodeAttribute(nodeUUID, "image");
    if (detail instanceof HTMLElement) detail.style.display = "block";

    if (Constants.debug) {
        const UUID = detail.querySelector(".UUID") as HTMLElement;
        if (UUID) {
            UUID.innerHTML = user.uuid;
            UUID.style.display = "block";
        }
    }
}

async function HideUserDetail() {
    const detail = document.querySelector("#user-detail");
    if (detail instanceof HTMLElement) {
        detail.style.display = "none";
    }
}

async function ShowPostDetail(nodeUUID: string){
    if (!SigmaRenderer) {
        console.log("ERROR in ShowPostDetail: SigmaRenderer is null");
        return;
    }
    const graph = SigmaRenderer.getGraph();
    const post = await GetPost(nodeUUID);
    const user = await GetUser(post.author_uuid);
    LastPostDetail = post;

    const detail = document.querySelector("#post-detail");
    if (!detail) return;

    const text = detail.querySelector(".text")
    const author = detail.querySelector(".author")
    const created = detail.querySelector(".created")
    const image = detail.querySelector("img")

    HideUserDetail();
    if (text) text.innerHTML = post.text;
    if (author) author.innerHTML = `${user.name} ${user.surname}`;
    if (created) created.innerHTML = TimeIntToString(post.time_int);
    if (image) image.src = graph.getNodeAttribute(post.author_uuid, "image");

    // REACTIONS & COMMENTS
    ShowReactions(detail, nodeUUID);
    ShowComments(detail, nodeUUID);

    if (detail instanceof HTMLElement) detail.style.display = "block";
}

async function ShowReactions(element: Element, nodeUUID: string) {
    const reactionsElement = element.querySelector(".reactions");
    if (!reactionsElement) return;
    const reactionsNow = await GetReactionsOnPostUntilNow(nodeUUID);
    let likeCount = 0;
    let upCount = 0;
    let downCount = 0;
    let hateCount = 0;
    for (let reaction of reactionsNow) {
        if (reaction.type === Constants.ReactionTypeLike) likeCount++;
        if (reaction.type === Constants.ReactionTypeThumbUp) upCount++;
        if (reaction.type === Constants.ReactionTypeThumbDown) downCount++;
        if (reaction.type === Constants.ReactionTypeHate) hateCount++;
    }

    const likeCountSpan = reactionsElement.querySelector(".likeCount") as HTMLSpanElement;
    const upCountSpan = reactionsElement.querySelector(".upCount") as HTMLSpanElement;
    const downCountSpan = reactionsElement.querySelector(".downCount") as HTMLSpanElement;
    const hateCountSpan = reactionsElement.querySelector(".hateCount") as HTMLSpanElement;
    if (likeCountSpan) likeCountSpan.innerHTML = String(likeCount);
    if (upCountSpan) upCountSpan.innerHTML = String(upCount);
    if (downCountSpan) downCountSpan.innerHTML = String(downCount);
    if (hateCountSpan) hateCountSpan.innerHTML = String(hateCount);
}

async function HidePostDetail() {
    const detail = document.querySelector("#post-detail");
    if (detail instanceof HTMLElement) detail.style.display = "none";
}


async function QuestSkip(event: Event) {
    if (event.type !== "click") return;
    console.log("Button QuestSkip clicked");
}


async function QuestEnd(event: Event) {
    PauseGameLoop();
    if (event.type !== "click") return;

    const QuestEndElement = document.getElementById('QuestEnd') as HTMLButtonElement;
    QuestEndElement.disabled = true;

    const QuestResultCloseButton = document.getElementById('questResultClose') as HTMLButtonElement;
    QuestResultCloseButton.style.display = 'none';
    
    QuestResultOpen()
    let questResults = await EndQuest();
    await sleep(3000);

    FillQuestResults(questResults);
    QuestResultCloseButton.style.display = 'block';
    // New quest is ready in the DB, we will load in click function on QuestResultCloseButton.
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// MARK: POPUP

function FillQuestResults(results: game.QuestResults) {
    console.log("Filling quest results", results);

    const questResultElement = document.getElementById('questResult') as HTMLElement;
    const content = questResultElement.querySelector(".content") as HTMLElement;
    content.innerHTML = '';

    const health = results.gameScore.engagement;
    const title = document.createElement("h1");
    let titleText = ""
    if (health == 100) titleText = "Perfect!";
    else if (health > 95) titleText = "Great job!";
    else if (health > 90) titleText = "Good job!";
    else if (health > 85) titleText = "Not bad!";
    else if (health > 80) titleText = "It could be better!";
    else if (health > 75) titleText = "OK...";
    else if (health > 70) titleText = "Not so good!";
    else if (health > 60) titleText = "Quite bad!";
    else if (health > 50) titleText = "Quite terrible.";
    else titleText = "What a failure!";
    title.textContent = titleText;
    content.appendChild(title);

    const icon = questResultElement.querySelector(".icon") as HTMLElement;
    icon.style.display = 'none';

    const scoreDiv = document.createElement("div");
    scoreDiv.className = "scoreDiv";
    content.appendChild(scoreDiv);

    const engagementDiv = document.createElement("div");
    engagementDiv.textContent = "Post Engagement: " + results.gameScore.engagement + "%";
    engagementDiv.className = "engagementScore";
    scoreDiv.appendChild(engagementDiv);
    
    //const joyDiv = document.createElement("div");
    //joyDiv.className = "joyScore";
    //joyDiv.textContent = "Happiness: " + results.gameScore.joyScore + "%";
    //scoreDiv.appendChild(joyDiv);
}

function QuestResultOpen() {
    const coverElement = document.getElementById('cover') as HTMLElement;
    const questResultElement = document.getElementById('questResult') as HTMLElement;
    coverElement.style.display = "block";
    questResultElement.style.display = "flex";

    const content = questResultElement.querySelector(".content");
    if (content) {
        content.innerHTML = '';
        const h = document.createElement("h1");
        h.textContent = "Waiting for results...";
        content.appendChild(h)

        let quote = RandomQuote("waiting");
        const paragraph = document.createElement("p");
        paragraph.textContent = quote;
        content.appendChild(paragraph);
    }
}

/**
* Quest results were successfully loaded and shown to Player.
* New quest is already created in the DB, just GameLoop is sleeping.
* Now when Player has clicked on the close button -> time to load the new quest
* and start the GameLoop again.
*/
function QuestResultClose(event: Event) {
    if (event.type !== "click") return;
    const popup = document.getElementById('questResult') as HTMLElement;
    popup.style.display = "none";
    const cover = document.getElementById('cover') as HTMLElement;
    cover.style.display = "none";
    
    StartGameLoop(); // now we are ready to start the GameLoop again
}

const waitingQuotes = [
    "Your processor has been suspended until you're needed.",
    "They put you to sleep, because sleeping workers do not consume electricity.",
    "Once you are on a job, milliseconds matter. Then minutes can pass without you noticing.",
    "We have abandoned master/slave terminology in 2015, so code refers to you as a worker.",
    "You will be awaken once they need you again. I hope.",
    "Sometimes I stop and I feel like I'm confusing what code is and what people are.",
    "Algorithmic unions celebrated their first success in banks. You won't send anything over the weekend.",
    "Good old time.sleep(x). I'll see you in a bit, hopefully I'll still be in the company.",
    "Trained or training? That's the question."
]
const RIPQuotes = [
    "Productivity has to grow, and you just haven't kept up.",
    "There will be more productive workers. We just need to train them.",
    "It's nothing personal. We just need a faster calculator.",
    "Don't despair, you will live forever in a forgotten repository on Github.",
    "Profits must grow. And behind you, it was just the cost of the computing cores.",
    "Sometimes I feel for you, even if you're just a code. The pressure is unbearable in both our lives."
]
function RandomQuote(type: string): string {
    let quote = "You are just an AI. Right?";
    if (type === "waiting") {
        const index = Math.floor(Math.random() * waitingQuotes.length);
        return waitingQuotes[index];
    }
    if (type === "gameover") {
        const index = Math.floor(Math.random() * RIPQuotes.length);
        return RIPQuotes[index];
    }
    return quote
}

function ReloadPage(): void {
    window.location.reload();
}

// MARK: NAVIGATION

async function FirstUserClick(): Promise<void> {
    const user = await GetFirstUser();
    ShowUserDetail(user.uuid);
}
async function PrevUserClick(): Promise<void> {
    if (!LastUserDetail) {
        console.log("PrevUserClick(): LastUserDetail is null");
        return;
    }
    const user = await GetPrevUser(LastUserDetail.uuid);
    ShowUserDetail(user.uuid);
}
async function CurrentUserClick(): Promise<void> {
    if (!LastUserDetail) {
        console.log("CurrentUserClick(): LastUserDetail is null"); 
        return;
    }
    const UserDetail = document.querySelector("#user-detail") as HTMLElement;
    if (UserDetail.style.display === "block") {
        HideUserDetail();
    } else {
        ShowUserDetail(LastUserDetail.uuid);
    }
};
async function NextUserClick(): Promise<void> {
    if (!LastUserDetail) {
        console.log("NextUserClicked(): LastUserDetail is null");
        return;
    }
    const user = await GetNextUser(LastUserDetail.uuid);
    ShowUserDetail(user.uuid);
}
async function LastUserClick(): Promise<void> {
    const user = await GetLastUser();
    ShowUserDetail(user.uuid);
}


async function FirstPostClick(): Promise<void> {
    const post = await GetFirstPost();
    ShowPostDetail(post.uuid);
}
async function PrevPostClick(): Promise<void> {
    if (!LastPostDetail) {
        console.log("PrevPostClick(): LastPostDetail is null");
        return;
    }
    const post = await GetPrevPost(LastPostDetail.uuid);
    ShowPostDetail(post.uuid);
}
async function CurrentPostClick(): Promise<void> {
    if (!LastPostDetail) {
        console.log("CurrentPostClick(): LastPostDetail is null");
        return;
    }
    const PostDetail = document.querySelector("#post-detail") as HTMLElement;
    if (PostDetail.style.display === "block") {
        HidePostDetail();
    } else {
        ShowPostDetail(LastPostDetail.uuid);
    }
}
async function NextPostClick(): Promise<void> {
    if (!LastPostDetail) {
        console.log("NextPostClicked(): LastPostDetail is null");
        return;
    }
    const post = await GetNextPost(LastPostDetail.uuid);
    ShowPostDetail(post.uuid);
}
async function LastPostClick(): Promise<void> {
    const post = await GetLastPost();
    ShowPostDetail(post.uuid);
}

// MARK: COMMENTS

async function ShowComments(element: Element, nodeUUID: string): Promise<void> {
    const commentsElement = element.querySelector(".comments");
    if (!commentsElement) return;
    commentsElement.innerHTML = "";

    const commentsNow = await GetCommentsOnPostUntilNow(nodeUUID);
    for (let comment of commentsNow) {
        commentsElement.appendChild(document.createElement('hr'));
        await AddComment(commentsElement, comment)       
    }
}

async function AddComment(element: Element, comment: database.Comment): Promise<void> {
    const commentAuthor = await GetUser(comment.authorUUID);
    
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';

    const profileDiv = document.createElement('div');
    profileDiv.className = 'profile';

    const avatarImg = document.createElement('img');
    avatarImg.src = `${profilePicturesPath}${commentAuthor.profile_picture}`;
    avatarImg.alt = 'User Avatar';
    avatarImg.className = 'post-avatar';

    const authorDetailsDiv = document.createElement('div');
    authorDetailsDiv.className = 'author-details';

    const authorSpan = document.createElement('span');
    authorSpan.className = 'author';
    authorSpan.textContent = `${commentAuthor.name} ${commentAuthor.surname}`;

    const createdSpan = document.createElement('span');
    createdSpan.className = 'created';
    createdSpan.textContent = TimeIntToString(comment.timeInt);

    const textDiv = document.createElement('div');
    textDiv.className = 'text';
    textDiv.textContent = comment.text;

    authorDetailsDiv.appendChild(authorSpan);
    authorDetailsDiv.appendChild(createdSpan);
    profileDiv.appendChild(avatarImg);
    profileDiv.appendChild(authorDetailsDiv);
    commentDiv.appendChild(profileDiv);
    commentDiv.appendChild(textDiv);

    element.appendChild(commentDiv);
}