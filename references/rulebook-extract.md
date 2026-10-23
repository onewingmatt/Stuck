# Stick 'Em (Sticheln) — real-rules extraction

Sources (all read directly, none derived from the port's code):
1. **Stick 'Em rulebook (Capstone Games, 2020 English edition)** — full transcription at
   https://www.rulespal.com/stick-em/rulebook (headings/paragraphs quoted verbatim below).
2. **Opinionated Gamers — Stick 'Em (2020 Capstone Version of Sticheln), Chris Wray**
   (https://opinionatedgamers.com/2020/08/10/stick-em-2020-capstone-version-of-sticheln-game-review-by-chris-wray/)
   — designer/publisher/players/time, deck-by-player-count, zero rule, trump rule, tie-break.
3. **Boards and Bees — Game Buzz: Stick 'Em** (https://boardsandbees.wordpress.com/2020/09/08/0993/)
   — 90-card deck, per-count card ranges, 15 cards per player, rounds = number of players.
4. **Pagat — Commercial Card Games: Sticheln** (https://www.pagat.com/com/ — "Sticheln" entry)
   — 1993 Klaus Palesch, 90 cards 0–14 in six suits, extended editions, penalty suit, off-suit trumps.
5. **BGG Board Gems — "Stick 'Em AKA Sticheln — How to Play, and Why It's a Gem"** (Darryl Boone)
   — designer/publisher history (Amigo 1993, NSV, Capstone English), "every suit other than the leading suit is
   trump", pain colour, game is about sticking others with pain cards.
6. **BGG — Stick 'Em (boardgame/354)** — 1993, take-all-the-cards-except-your-pain-suit description.

> Identity: the German original is **Sticheln** (designer **Klaus Palesch**, published by **Amigo, 1993**;
> later NSV editions; English edition **Stick 'Em**, Capstone Games, 2020). There is **no game called "Stuck"**
> and **no Heinz Meister / Abacus** connection — that attribution is wrong (Heinz Meister is a different designer;
> Abacus is a different publisher). The implemented rules are Sticheln/Stick 'Em.

## Object of the game (rulebook)

> "Each player is dealt cards. They each select one of these cards to specify for themselves their 'misery
> colour'. The object of the game is to take as many tricks as possible, while avoiding cards of the 'misery
> colour'. Cards in the 'misery colour' bring negative points, while the other colours bring positive points. The
> player with most points wins."

## Game setup — cards used by player count (rulebook table)

| Players | Cards | Colours |
|---|---|---|
| Three players | Cards 0-8 | in green, brown, red, blue and yellow |
| Four players | Cards 0-11 | in green, brown, red, blue and yellow |
| Five players | Cards 0-14 | in green, brown, red, blue and yellow |
| Six players | Cards 0-14 | in green, brown, red, blue, yellow and violet |
| Seven players | Cards 0-17 | in green, brown, red, blue, yellow and violet |
| Eight players | Cards 0-18 | in green, brown, red, blue, yellow and violet |

> "The cards are shuffled and dealt out to each player. Each player will receive 15 cards (14 cards, if eight are
> playing). Note: With seven players three cards remain un-dealt, and with eight players two cards remain. These
> cards are shown to all players, and set aside."

(Opinionated Gamers confirms: "The deck consists of cards numbered 0-14 in six suits, but you vary the cards in
play by the player count. For example, with 4 players, you use 0-11 in five suits." Pagat adds the first edition
was 90 cards 0–14 in six suits; later editions add 15–18 in three suits and 15–20 in three suits to reach 8
players.)

## Choosing your "Misery Colour" (rulebook)

> "Each player looks at his hand and chooses his 'misery colour' for this hand. He then selects a card of this
> colour from his hand and places it face down in front of him. Once everyone has placed a card facedown, all
> players reveal them at the same time. They then remain face up until the end of the round. Thus everyone knows
> every one else's misery colour. It can happen that several players selected the same misery colour. Each card
> in the misery colour that a player takes in tricks will score negative points according to the card's face
> value. The misery begins with the selection of the misery colour, because the card used to declare a player's
> misery colour is counted against that player at the end of the round."

## Game play (rulebook)

> "The starting player begins by playing a card to the centre of the table. Next, each player must, in turn, play
> a card from his hand. You need not follow suit. Any card can be played. The cards played into the centre of the
> table are the 'trick'. The colour of the first card played is the 'lead colour'. Every other colour played in
> that trick is a trump colour. Every card in a trump colour is a trump card, with the exception of the 0 card.
> Important: The 0 card is not a trump card."

## Who wins a trick (rulebook)

> "If only cards in the lead colour were played to the trick, the player who played the highest number card wins
> the trick." — Example: Axel 6, Lore 5, Uli 2, Doris 11 → **Doris wins**.
> "If, other than cards of the lead colour, 0 cards were played, the player who played the highest number card in
> the lead colour wins the trick. A 0 card is not a trump card." — Example: Doris 3, Axel 2, Lore 0, Uli 4 →
> **Uli wins**.
> "If, other than cards of the lead colour, at least one trump card was played, the player who played the trump
> card with the highest number wins the trick. A 0 card cannot win this trick." — Example: Uli 10 (lead), Doris 0,
> Axel 7 (trump) → **Axel wins**; Lore 11 (lead) does not matter.
> "If more than one trump cards of the same, highest numerical value were played, the player who played the first
> highest-valued trump card in the trick wins the trick." — Example: Axel 11 (lead), Lore 6 (trump) wins, Uli 6
> (trump), Doris 4 (trump).
> "In a trick where the only cards played were 0 cards, then the player who led the first 0 card wins the trick."

> "The winner of the trick takes the cards and places them face-down in a pile in front of himself. This player
> then begins the next trick by playing the first card. The colour of this first card is the new lead colour."

## End of the round, and scoring (rulebook)

> "After 14 tricks (13 tricks with eight players) the round ends. Each player now has at least one card in his
> misery colour (the card used to declare that colour), and possibly other cards taken in tricks. Each card in
> his misery colour counts as negative points according to the numerical value on the card. Each card not in his
> misery colour counts as one positive point, independent of the value on the card. To determine a player's score
> for the round, add the positive points and subtract the negative points."

> Example: "Axel used a red 4 to declare his misery colour. In his tricks he's taken a red 2 and 5, as well as 14
> cards in other colours. For the 14 other cards Axel receives 14 points, and for the red cards he receives
> 4 + 2 + 5, or 11 negative points. Thus, his score for the round is 14 - 11, or 3 points."

## The next round (rulebook)

> "A player shuffles together all the cards and deals them to all the players evenly, as before. The player to
> the left of the dealer leads the first card."

## Ending the game (rulebook)

> "The game ends after five rounds. The player with the most points is the winner. If all players have negative
> points, the player with the fewest negative points is the winner."

## Variants in the rulebook (not implemented in the port)

- **Reverse Sticheln**: lucky colour counts positive at face value, other cards −1 each, lowest trump wins.
- **Mild Sticheln**: each misery card counts −5 (not face value).
- **Aggravated Sticheln**: two misery colours, two declared cards; 13/12 tricks.
- **Hazy Sticheln**: misery card stays face-down until round end.
- **Delayed Sticheln**: choose misery colour at round end from collected colors; 15/14 tricks; players who took no
  trick score 0.
- **Sticheln "Hat Trick"** (4–6 players): double-trick game with 1–20 in three colors.

## Extra verified fact (Pagat)

> "Each player is dealt 15 cards and puts one face down to represent his or her penalty suit. In the play, all
> cards greater than zero in all suits other than the suit led function as trumps. Players lose the face value of
> all cards taken in their own penalty suit but score +1 for each other card taken."

## Worked examples used in the audit

1. Rulebook lead-color example: lead 6, then 5, 2, 11 → highest in lead color (11) wins.
2. Rulebook zero-not-trump example: 3 (lead), 2, 0, 4 → highest lead-color (4) wins; the 0 does not win.
3. Rulebook trump example: 10 (lead), 0, 7 (trump), 11 (lead) → trump 7 wins.
4. Rulebook tie example: 11 (lead), 6 (trump), 6 (trump), 4 (trump) → the **first** 6 wins.
5. Rulebook all-zeros example: 0, 0, 0, 0 → the **first** 0 wins.
6. Rulebook scoring example: declare red 4; won red 2, red 5, 14 others → 14 − 11 = **+3**.
7. Deal counts: 3p/4p/5p/6p → 15 each; 7p → 15 each + 3 leftover; 8p → 14 each + 2 leftover.
8. Game length: **five rounds** classic; rounds = number of players is a local variant (Boards and Bees documents
   "the game continues until you have played as many rounds as you have players" for some editions — noted).
