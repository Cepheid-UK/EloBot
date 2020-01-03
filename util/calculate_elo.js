// importing function parameters
const parameters = require('./elo_parameters.json')

exports.calculateElo = function(rating_p1, rating_p2, p1_winner) {

    // based on the current ratings, we calculate each players win probability
    win_prob_p1 = 1 / (1 + Math.pow(parameters.const_alpha, (rating_p2 - rating_p1) / parameters.const_beta))
    win_prob_p2 = 1 / (1 + Math.pow(parameters.const_alpha, (rating_p1 - rating_p2) / parameters.const_beta))

    // calculate the new rating for each player based on their pre-match win probabilities and the outcome of the match
    new_rating_p1 = Math.round(rating_p1 + parameters.const_kappa * (p1_winner - win_prob_p1))
    new_rating_p2 = Math.round(rating_p2 + parameters.const_kappa * (1 - p1_winner - win_prob_p2))

    return [new_rating_p1, new_rating_p2]
    
}


// Test values
/*player_1 = {
    "games": 10,
    "rating": 1500
}

player_2 = {
    "games": 20,
    "rating": 1400
}*/

//var outcome = calculateElo(player_1.rating, player_2.rating, 1)
//console.log(outcome)
