enum React {
    Love = '♥️',
    Like = '👍🏿',
    Dislike = '👎🏻',
    Hate = '🤬'
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
    reactions: Reaction[],
    comments: Comment[],
    relationships: Relation[]
}