
/*
  TennisJS
  A vanilla Javascript library for scoring tennis matches.
  Copyright (C) 2023  Matthew Riffle
  
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
  
  See complete license file included with distribution.
  
  Find the code at: https://github.com/mattriffle/tennisjs
*/

// Point Types
const WINNER         = 1;
const UNFORCED_ERROR = 2;
const ACE            = 3;
const SERVICE_WINNER = 4;
const DOUBLE_FAULT   = 5;
const RETURN_WINNER  = 6;
const REGULAR        = 7;
  
class Point {
  constructor(winner, how, fault, server) {
    this.winner = winner;
    this.how = how;
    this.fault = fault;
    if (this.how === DOUBLE_FAULT) { this.fault = 1; } // Catch obvious case
    this.server = server; // Only actually used by tiebreak points
  }
}

class Game {
  constructor(server) {
    this.server = server;
    this.winner = 0;
    this.score = { 1: 0, 2: 0 };
    this.iscore = { 1: 0, 2: 0 };
    this.points = [];
  }

  name_of_score(num) {
    let ScoreNames = {
      0: 0,
      1: 15,
      2: 30,
      3: 40
    }
    return ScoreNames[num];
  }

  score_point(winner, how, fault) {
    if (this.winner) {
      return 0;
    }
    how = how || REGULAR;
    let point_object = new Point(winner, how, fault);
    this.iscore[winner]++;
    this.points.push(point_object);
    
    this.update_game();
  
    return 1;
  }

  remove_point() {
    // This is a no-op if there are no points
    if (this.points.length === 0) { return }
    let lp = this.points.pop();
    this.iscore[lp.winner]--;
    this.update_game();
  }
    
  update_game() {
    let leader = 1; let loser = 2;
    this.winner = 0; // In case of point being removed after victory
    if (this.iscore[2] > this.iscore[1]) {
      leader = 2; loser = 1;
    }
    if (this.iscore[leader] >= 4) {
      this.score[leader] = '-'; this.score[loser] = '-';
      if ((this.iscore[leader] - this.iscore[loser]) > 1) {
        this.winner = leader;
      } else if (this.iscore[leader] == this.iscore[loser]) {
        this.score[leader] = 'DEUCE'; this.score[loser] = 'DEUCE';
      } else {
        this.score[leader] = 'ADV';
      }
    } else {
      this.score[leader] = this.name_of_score(this.iscore[leader]);
      this.score[loser] = this.name_of_score(this.iscore[loser]);
    }
  }
}

class TieBreak {
  constructor(server) {
    this.server = server;
    this.winner = 0;
    this.score = { 1: 0, 2: 0 };
    this.points = [];
  }
  
  score_point(winner,how,fault) {
    if (this.winner) { return 0; }
    how = how || REGULAR;
    let point_object = new Point(winner, how, fault, this.server);
    this.score[winner]++;
    this.points.push(point_object);
    this.update_game();
    
    return 1;
  }
  
  remove_point() {
    if (this.points.length === 0) { return; }
    let lp = this.points.pop();
    this.score[lp.winner]--;
    this.update_game();
  }
  
  update_game() {
    let leader = 1; let loser = 2;
    this.winner = 0;
    
    // After Odd Points in the tiebreak, swap servers
    if ((this.score[1] + this.score[2]) % 2 != 0) {
      this.server = (this.server === 1) ? 2 : 1;
    }
    
    // Do we have a winner?
    if (this.score[2] > this.score[1]) {
        leader = 2; loser = 1;
    }
    if (this.score[leader] >= 7 && (this.score[leader] - this.score[loser] >= 2)) {
      this.winner = leader;
    }
  }
}

class Set {
  constructor(the_server) {
    this.winner = 0;
    this.score = { 1: 0, 2: 0};
    this.game = new Game(the_server);
    this.games = [];
    this.tiebreak = null;
  }

  score_point(winner,how,fault) {
    if (this.tiebreak) { // We're in a tiebreak
      this.tiebreak.score_point(winner,how,fault);
    } else {
      this.game.score_point(winner,how,fault);
    }
    this.update_set();
  }

  remove_point() {
    if (this.tiebreak && (this.tiebreak.score[1] + this.tiebreak.score[2] > 0)) {
      this.tiebreak.remove_point();
      this.winner = 0;
      this.update_set();
      return 1;
    }
    
    // If we get here and there's a tiebreak, we need to get rid of it
    this.tiebreak = null;
    
    if (this.game.score[1] == 0 && this.game.score[2] == 0 && this.games.length != 0) {
      // We're in a new game; remove point from last game.
      this.game = this.games.pop();
      this.score[this.game.winner]--;
    }
    
    this.winner = 0; // Any victory would be undone by this change.
    this.game.remove_point();
    
    this.update_set();
  }

  update_set() {
    let the_winner;
    let the_next_server = (this.game.server % 2 === 0) ? 1 : 2;
    
    if (this.tiebreak && this.tiebreak.winner) {
      the_winner = this.tiebreak.winner;
    } else if (this.game.winner) {
      the_winner = this.game.winner;
      this.games.push(this.game);
      this.game = new Game(the_next_server);
    } else {
      return;
    }
    
    this.score[the_winner]++;


    let leader = 1; let loser = 2;
    if (this.score[2] > this.score[1]) { 
      leader = 2; loser = 1;
    }
    
    // Entering a tiebreak?
    if (this.score[leader] === 6 && this.score[loser] === 6) {
      this.tiebreak = new TieBreak(the_next_server);
      this.next_server = (the_next_server === 1) ? 2 : 1; // We start next set with whoever _didn't_ serve first in Tie Break
      return;
    }
    
    // Do we have a winner?
    if (this.score[leader] >= 6 && (this.score[leader] - this.score[loser]) >= 2) {
      this.winner = leader;
    } 
    if (this.score[leader] === 7 && this.score[loser] === 6) {
      this.winner = leader;
    }
    this.next_server = the_next_server;
  }
}

class TennisMatch {
  constructor(player1, player2, num_sets) {
    if (num_sets % 2 === 0) { return 0; }
      this.player = { 1: player1, 2: player2};
      this.num_sets = num_sets;
      this.score = {1: 0, 2: 0};
      this.set = new Set(1);
      this.sets = [];
  }

  score_point(winner,how,fault) {
    if (this.winner) { return } // The Match is over

    this.set.score_point(winner,how,fault);
    this.update_match();
  }

  remove_point() {
    // If we're in the first point of the first game and it's not the first set, pop back a set
    if (this.set.game.score[1] == 0 && this.set.game.score[2] == 0 
           && this.set.games.length === 0 && this.sets.length != 0) {
      this.set = this.sets.pop();
      this.score[this.set.winner]--;
    }
    this.winner = 0; // Any victory would be undone by this change.
    this.set.remove_point();
    
    this.update_match();
  }

  update_match() {
    if (!this.set.winner) { return }
    
    this.score[this.set.winner]++;

    let to_serve = this.set.next_server;
    this.sets.push(this.set);
    this.set = new Set(to_serve);

    let leader = (this.score[1] > this.score[2]) ? 1 : 2;
    if (this.score[leader] > (this.num_sets / 2)) {
      this.winner = leader;
    }
  }
  
  match_stats() {
    // It seems quite possible I'm going to Javascript Hell for this entire sub.
    let stats = { 
      1: {
        aces: 0,
        breaks: 0,
        points_served: 0,
        faults: 0,
        double_faults: 0,
        unforced_errors: 0,
        service_winners: 0,
        winners: 0,
        return_winners: 0
      }, 
      2: {
        aces: 0,
        breaks: 0,
        points_served: 0,
        faults: 0,
        double_faults: 0,
        unforced_errors: 0,
        service_winners: 0,
        winners: 0,
        return_winners: 0
      } 
    };
    
    // If not for this use of JSON to clone an object's data safely....
    let clean_clone = JSON.parse(JSON.stringify(this));
    
    /// then for the triple nested for loop.
    let all_sets = clean_clone.sets;
    all_sets.push(clean_clone.set);
    for (let set_inc = 0; set_inc < all_sets.length; set_inc++) {
        let all_games = all_sets[set_inc].games;
        all_games.push(all_sets[set_inc].game);
        if (all_sets[set_inc].tiebreak) { all_games.push(all_sets[set_inc].tiebreak) }

        for (let game_inc = 0; game_inc < all_games.length; game_inc++) {
          
          // Game level stats (We use iscore to know it's not the potential tiebreak we tossed in)
          let game = all_games[game_inc];
          if (game.iscore && game.winner && game.winner != game.server) { stats[game.winner].breaks++ }
          
          let all_points = all_games[game_inc].points;
          for (let point_inc = 0; point_inc < all_points.length; point_inc++) {
            let point = all_points[point_inc];

            let the_server = (point.server) ? point.server : game.server;
                        
            // Related to the serve
            stats[the_server].points_served++;
            if (point.fault) { stats[the_server].faults++ }
            if (point.how === DOUBLE_FAULT) { stats[the_server].double_faults++ }
            if (point.how === ACE) { stats[the_server].aces++ }
            if (point.how === SERVICE_WINNER) { stats[the_server].service_winners++ }
            
            // Other
            if (point.how === UNFORCED_ERROR) {
              let loser = (point.winner === 1) ? 2 : 1;
              stats[loser].unforced_errors++;
            }
            if (point.how === WINNER) { stats[point.winner].winners++ }
            if (point.how === RETURN_WINNER) { stats[point.winner].return_winners++ }
          }
        }
    }
    return stats;
  }
  
  match_score(server) {
    let receiver = 1;
    if (server === 1) { receiver = 2 }
    let score = [];
    
    this.sets.forEach(function (the_set,index) {
      let sc = the_set.score[server] + "-" + the_set.score[receiver];
      if (the_set.tiebreak) {
        sc = sc + " (" + the_set.tiebreak.score[server] + "-" + the_set.tiebreak.score[receiver] + ")";
      }
      score.push(sc);
    });
    
    if (!this.winner) {
      score.push(this.set.score[server] + "-" + this.set.score[receiver]);
    }
    
    return score.join(", ");
  }
  
  match_summary() {
    let cur_obj = this.set.game;
    if (this.set.tiebreak) { cur_obj = this.set.tiebreak; }
    let receiver = (cur_obj.server === 1) ? 2 : 1;
    
    let summary = {
      meta: { 
          type: "Game",
          server: cur_obj.server,
          receiver: receiver,
          player: {
            1: this.player[1],
            2: this.player[2]
          },
       },
      1: { sets: this.score[1],
           games: this.set.score[1],
           points: this.set.game.score[1]},
      2: { sets: this.score[2],
            games: this.set.score[2],
            points: this.set.game.score[2]},

    };
     
    if (this.set.tiebreak) {
      summary[1].points = this.set.tiebreak.score[1];
      summary[2].points = this.set.tiebreak.score[2];
      summary.meta.type = "Tiebreak";
    }
    
    if (this.winner) {
      summary.winner = this.winner;
      summary.match_score = this.match_score(this.winner);
    } else {
      summary.match_score = this.match_score(cur_obj.server);
    }
        
    return summary;
  }
  
}
// TennisJS will return with.... Doubles Support?





