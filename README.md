# Ehomaki Eating Challenge

A mini-game where you try to eat an entire ehomaki (fortune sushi roll) on Setsubun day.

![Demo](demo.gif)

## Game Overview

On Setsubun (Japanese bean-throwing festival), the player holds an ehomaki and tries to eat it all while facing the lucky direction (Eho - West-Southwest in 2025) in silence. However, "ehomaki thieves" appear from all directions trying to steal your ehomaki.

Defeat the approaching thieves with your "glare" attack while eating the ehomaki. Finish eating it all to clear the game!

## How to Play

- The ehomaki is eaten automatically (60 seconds to clear)
- Defeat "ehomaki thieves" appearing from all directions
- Move your mouse/finger to aim your "glare" direction
- Click or tap to activate the "glare" attack
- Game over if a thief touches you

## Controls

| Action | Input |
|--------|-------|
| Aim glare | Mouse movement / Touch drag |
| Activate glare | Left click / Tap / Space key |
| Pause | Esc key |
| Retry | R key (result screen only) |

## Scoring System

- Defeat thief: 100 points × multiplier
- Eat 1% of ehomaki: 50 points
- Clear bonus: 5,000 points
- Consecutive defeats within 2 seconds increase multiplier (up to 5x)

## Tech Stack

- HTML5 / CSS3 / JavaScript (ES6+)
- Canvas API
- LocalStorage API (high score persistence)

## File Structure

```
ehomaki_eating_challenge/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── main.js
│   ├── game.js
│   ├── player.js
│   ├── enemy.js
│   ├── ui.js
│   └── utils.js
└── assets/
    └── images/
```

## Play

Open `index.html` in a browser to start the game.

GitHub Pages: https://rsasaki0109.github.io/ehomaki_eating_challenge/

## License

MIT License
