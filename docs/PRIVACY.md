# Privacy Note

Praesidium is a static browser game hosted through GitHub Pages. It does not include a backend server, user accounts, advertising SDKs, analytics trackers, payment processing, or third-party telemetry code.

## What is stored

The game stores campaign progression, talents, scores, activity rewards, and battle checkpoints in IndexedDB on this device. Settings, tutorial actions, achievement counters, and opt-in playtest diagnostics remain in `localStorage`. The update reads earlier storage to migrate supported progress, and does not delete the original records.

The two exports are separate. A progress backup includes campaign and activity data plus the current battle, if saved. The playtest export contains local timings and aggregate outcomes; the game does not upload it. Only share a file you intend to send. Clearing the browser's site data can erase locally stored and offline data.

## What is not collected by the game

Praesidium itself does not collect or transmit:

- names;
- email addresses;
- account identifiers;
- payment data;
- location data;
- cross-site tracking identifiers;
- gameplay telemetry to a remote server.

## Hosting note

The game is served by GitHub Pages, so normal web hosting logs may be processed by GitHub according to GitHub's own policies. Praesidium does not add a separate tracking layer on top of that hosting.

## Clearing data

Players can clear Praesidium progress by clearing site data for the GitHub Pages domain in their browser settings. Future versions may add an in-game reset button for convenience.
