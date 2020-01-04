import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from game import Game
from player import Player
from util import *


win_prob = []
alpha_list = list(range(5, 45, 5))

beta = 400


for alpha in alpha_list:

    elo_diff = []
    win_temp = []    

    for val in list(range(0, 1000, 10)):
        elo_ratings = (1500, 1500 + val)
        elo_diff.append(val)
        win_temp.append(get_win_prob(elo_ratings, alpha, beta)[0])

    win_prob.append(win_temp)




plt.style.use('ggplot')

fig, ax = plt.subplots(
    figsize=(10, 8)
)

for i, win_list in enumerate(win_prob):
    label = f'alpha = {alpha_list[i]}'
    ax = plt.plot(elo_diff, win_list, label=label)

plt.title('Win Probability over Difference in ELO Rating', size=22)

plt.xlabel('Difference in ELO Rating', size=14)
plt.ylabel('Win Probability', size=14)

plt.legend()
plt.tight_layout()
plt.show()
