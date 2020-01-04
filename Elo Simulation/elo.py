import numpy as np


class Elo(object):

    def __init__(self, ratings, *, A_=10, B_=400):
        
        self.ratings = list(ratings) if not isinstance(ratings, list) else ratings
        self.A_ = A_
        self.B_ = B_

    def get_win_prob(self):
        self.win_prob = [1 / (1 + self.A_ ** ((self.ratings[1 - i] - x) / self.B_)) for i, x in enumerate(self.ratings)]
        return self.win_prob

    def get_elo_swing(self):
        pass

    def get_new_elo(self, winner):
        pass

