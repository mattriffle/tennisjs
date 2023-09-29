// vanilla_example.js -- part of the Vanilla HTMl/CSS/JS reference for the TennisJS project - https://github.com/mattriffle/tennisjs
// See distribution for license file

// We keep most globals in an object, except for the main game object
let van_glo = {
    urlParams: new URLSearchParams(window.location.search),
    fault: 0,
    reset: 0,
    cur_state: null,
    timeout_id: null
};

let van_game = null;

function add_fault() {
    if (!van_glo.fault) {
        van_glo.fault++;
        redraw_e("fault_button", "DOUBLE FAULT");
    } else {
        score_it(van_glo.cur_state.meta.receiver, DOUBLE_FAULT);
    }
}

function remove_fault() {
    van_glo.fault = 0;
    redraw_e("fault_button", "FAULT")
}

function redraw_e(where, what) {
    document.getElementById(where).innerHTML = what;
}

function redraw() {
    van_glo.cur_state = van_game.match_summary();

    // Debugging look at object
    if (van_glo.urlParams.get('dancemode') == 1) { // That's a Bluey reference
        redraw_e("wholeobj", "<pre>" + JSON.stringify(van_game.match_summary(), null, 2) + "\n" + JSON.stringify(van_game, null, 2) + "</pre>");
    }

    // Clear top messages
    redraw_e("warning", "");

    // Type of game (regular or tiebreak)
    redraw_e("game_type", van_glo.cur_state.meta.type);

    // Player data
    let i = 1;
    while (i <= 2) {
        redraw_e("player" + i, van_glo.cur_state.meta.player[i]);
        redraw_e("player" + i + "b", van_glo.cur_state.meta.player[i]);
        redraw_e("sets" + i, van_glo.cur_state[i].sets);
        redraw_e("games" + i, van_glo.cur_state[i].games);
        redraw_e("score" + i, van_glo.cur_state[i].points);
        i++;
    }

    // Set the serving indicators
    redraw_e("serving" + van_glo.cur_state.meta.server, "&#127934;");
    redraw_e("serving" + van_glo.cur_state.meta.receiver, "");

    // Set the proper buttons based on who is serving
    div_state("p_serving" + van_glo.cur_state.meta.server, "inline-block");
    div_state("p_receiving" + van_glo.cur_state.meta.server, "none");
    div_state("p_serving" + van_glo.cur_state.meta.receiver, "none");
    div_state("p_receiving" + van_glo.cur_state.meta.receiver, "inline-block");

    // If we have a winner, display it
    if (van_glo.cur_state.winner) {
        redraw_e("winner_name", van_glo.cur_state.meta.player[van_glo.cur_state.winner]);
        redraw_e("winner_score", van_glo.cur_state.match_score);
        redraw_e("serving" + van_glo.cur_state.meta.server, "");
        div_state("winner_table", "block");
        div_state("player1_buttons", "none");
        div_state("player2_buttons", "none");
        div_state("undo_serve", "none")
    } else {
        div_state("winner_table", "none");
        div_state("player1_buttons", "block");
        div_state("player2_buttons", "block");
    }

}

function div_state(id, new_state) {
    document.getElementById(id).style.display = new_state;
}

// Thanks to http://shebang.mintern.net/foolproof-html-escaping-in-javascript/
function escape_html(str) {
    var sane = document.createElement('sane');
    sane.appendChild(document.createTextNode(str));
    return sane.innerHTML;
}

function init_match() {

    // If anybody wants to try to do XSS, we'll just encode it for fun.  In general, this whole
    // interface happens in-browser so people can of course hack on it if they really want to.
    let player1 = escape_html(document.getElementById("p1_name").value);
    let player2 = escape_html(document.getElementById("p2_name").value);
    if (player1 === "" || player2 === "") {
        redraw_e("warning", "Must Name Each Player");
        return;
    }

    let num_sets = document.getElementById("num_sets").value;
    if (num_sets != 5 && num_sets != 3) { num_sets = 1; } // cheap validation

    van_game = new TennisMatch(player1, document.getElementById("p2_name").value, num_sets);
    redraw();
    div_state("score_table", "block");
    div_state("undo_serve", "block");
    div_state("player1_buttons", "block");
    div_state("player2_buttons", "block")
    div_state("new_match", "block");
    div_state("get_players", "none");
}

function score_it(num, how) {
    let h = how || REGULAR;
    van_game.score_point(num, h, van_glo.fault);
    remove_fault();
    redraw();
}

function remove_it() {
    if (van_glo.fault) {
        return remove_fault()
    } // Just undo locally if fault
    van_game.remove_point();
    redraw();
}

function reset_match() {
    if (!van_glo.reset) {
        redraw_e("reset_button", "PRESS AGAIN WITHIN 5s TO CONFIRM");
        van_glo.reset = 1;
        van_glo.timeout_id = setTimeout(function() {
            if (van_glo.reset === 1) { // no decision made
                van_glo.reset = 0;
                redraw_e("reset_button", "Start New Match");
            }
        }, 5000);
        return;
    }

    clearTimeout(van_glo.timeout_id);
    van_game = null;
    van_glo.reset = 0;
    div_state("score_table", "none");
    div_state("undo_serve", "none");
    div_state("player1_buttons", "none");
    div_state("player2_buttons", "none")
    div_state("new_match", "none");
    div_state("winner_table", "none");
    document.getElementById('p1_name').value = '';
    document.getElementById('p2_name').value = '';
    redraw_e("reset_button", "Start New Match");
    div_state("get_players", "block");
}