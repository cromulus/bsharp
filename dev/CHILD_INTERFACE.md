# Interface for a child who cannot yet read

## What the game does

The child learns consistent chord/color associations, then identifies an unseen
chord by choosing its color. The app records the first answer and its confusion
matrix. Adult-selected levels determine the available colors; random/adaptive
selection and the existing chord mappings remain intact.

The published method involves supervised, repeated listening and correction.
Its study does not establish efficacy for this app, guitar timbres, or independent
play. The app also does not implement the full later single-note program.
Source: [Sakakibara, 2014](https://www.ganbar.us/documents/sakakibara_2012_chord_identification.pdf).

## Decisions

- Keep color identities and stable pad positions; no decoration reveals the answer
  before the first guess. Use one large speaker and a three-picture sequence.
- Replace written overlays covering the answers with a persistent picture guide.
  Short text labels help the accompanying adult without being necessary to play.
- Offer unscored exploration before asking a child to identify unfamiliar sounds.
- A wrong guess reveals the matching pad with a speaker symbol. Tapping that pad
  replays the same recording; Next unlocks after playback successfully starts.
  Corrections do not count as new trials or correct first answers.
- Keep the cat friendly for both right and wrong answers. No buzzer, loss of
  progress, accuracy grade, reward sound, speed bonus, or automatic level-up.
- Progress tracks trials, not success. Stop at the selected target, preserve the
  result, and let the adult start another session after a break.
- Keep settings/reset behind a hold-to-open parent area. It is an accidental-tap
  guard, not authentication. Retain keyboard access and reduced-motion support.
- Keep large targets at later levels; permit vertical scrolling if necessary.
  Browser automation cannot establish usability with the intended child: observe
  whether he recognizes the speaker, understands the highlighted correction,
  and can move to the next sound without prompting during initial sessions.
