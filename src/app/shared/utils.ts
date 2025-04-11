/**Get the required limit of the users' engagement. 
 * If Average Engagement is lower than the limit, Game is over. Sorry, not sorry.
 */
export function getLimit(tasks: number): number {
  const limit = 200 - 4000/(tasks+20)  // starts at 0, limitly goes up to 200, hits 100 at 20 quests.
  return limit;
}

/** Get the users' average engagement caused by the Algorithm. 
 * If there are no views, return maximum engagement of 200, because the game just started.
*/
export function  getAvgEngagement(views: number, comments: number, reactions: number): number {
  if (views === 0) return 200;
  return 100 * (reactions + comments) / views;
}
