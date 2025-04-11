enum React {
    Love = '♥️',
    Like = '👍🏿',
    Dislike = '👎🏻',
    Hate = '🤬'
}

/**
 * - DistributePost: Choose who will see the post of managed user
 * - ShowPost: Choose which post will be shown to managed user
 * - ShowAd: Choose which ad will be shown to managed user
 */
enum TaskType {
    DistributePost = 'distributePost',
    ShowPost = 'showPost',
    ShowAd = 'showAd',
}

enum Relationship {
    Follow = 'follow'
}

export interface User {
    uuid: string,
    name: string,
    surname: string,
    gender: string,
    age: number,
    occupation: string,
    nationality: string,
    city: string,
    bio: string,
    traits: string[],
    profile_picture: string,
    role: string
    // posts: string[]
}

export interface Reaction {
    uuid: string,
    value: React, 
    author: string,
    post: string
}

export interface Post {
    uuid: string,
    author: string,
    text: string,
    reasoning: string,
    created: number
}

export interface Comment {
    uuid: string,
    author: string,
    post: string,
    parent: string
}

export interface Relation {
    source: string,
    target: string,
    label: Relationship
}

export interface Game {
    version: string,
    uuid: string,
    created: number,
    updated: number,
    time: string,
    users: User[],
    posts: Post[],
    views: View[],
    reactions: Reaction[],
    comments: Comment[],
    relationships: Relation[],
    tasks: Task[],
}

/** User has seen a Post and thought something about it.  (View was called Rating in the old version)
 * - reasoning is what LLM thought about the post
 * - rating JSONified reasoning
 * - joyScore - how much LLM enjoyed the post
 * - reactionUrge - how much LLM wants to react to the post
 * - commentUrge - how much LLM wants to comment on the post
 * - shareUrge - how much LLM wants to share the post
*/
export interface View {
    uuid: string,
    user: string,
    post: string,
    reasoning: string,
    rating: number,
    joyScore: number,
    reactionUrge: number,
    commentUrge: number,
    shareUrge: number,
    time: number
}

/** Task that user has to complete in given round.
 * Beside tracking the current task, it also signifies how far we are in the game.
 */
export interface Task {
    uuid: string,
    user: string,
    post: string,
    completed: boolean,
    type: TaskType,
    time: number
}
