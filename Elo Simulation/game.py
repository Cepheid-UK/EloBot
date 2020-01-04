import numpy as np

from player import Player
from util import get_win_prob


class Game(object):

    def __init__(self, players):
        self.players = players
        self.ratings = [player.rating for player in players]
        self.win_probabilities = get_win_prob(self.ratings)

    def solve_game(self):
        outcome_ = np.random.choice([0, 1], self.win_probabilities)
        self.winner = self.players[outcome_]
        self.loser = self.players[1 - outcome_]
        return None


    def calculate_elo(self):
        pass

    

    def update_elo_rating(self):
        pass