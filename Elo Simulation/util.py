import numpy as np

def get_win_prob(ratings, A_=10, B_=400):
    ratings = list(ratings) if not isinstance(ratings, list) else ratings
    return [1 / (1 + A_ ** ((ratings[1 - i] - x) / B_)) for i, x in enumerate(ratings)]

