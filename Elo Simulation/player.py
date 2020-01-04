import numpy as np


class Player(object):

    def __init__(self, true_rating):
        
        self.games_played = 0
        self.rating = 1500
        self.true_rating = true_rating
        self.learning_rate = 1.0


    def update_games_played(self):
        self.games_played += 1


    def update_true_rating(self):
        pass


    def update_elo_rating(self, is_winner=True):
        pass





