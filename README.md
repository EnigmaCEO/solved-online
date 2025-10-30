🧩 Solved! — A Classic Jigsaw Adventure on Reddit

Solved! transforms Reddit into a global puzzle gallery — combining classic jigsaw fun with community creativity and competition.
Built for the Reddit Devvit Hackathon, this project showcases the power of community-generated content, seamless CDN integration, and the Kiro framework for scalable Reddit-native play.

🎯 Overview

Solved! is a bite-sized asynchronous puzzle game where Reddit users can:

Play beautiful jigsaw puzzles directly in the Reddit feed.

Unlock achievements and collectible flairs through gameplay.

Submit their own images to create community puzzles.

Compete for leaderboard spots and share results in comment threads.

The experience merges single-player relaxation with community-driven creativity — aligning perfectly with Reddit’s spirit of shared interests and creation.

🌟 Key Features
🧠 Official Puzzles

Curated puzzle sets loaded from the Reddit CDN.

Categories grouped by difficulty (20 / 35 / 63 / 108 pieces).

Progressive unlocks through Leisure Mode — learn before challenge.

🧩 Community Puzzles

Users comment with an image → the bot validates and processes it automatically.

Puzzles are assigned difficulty dynamically based on image complexity.

Approved submissions generate new posts with custom splash screens.

Each puzzle gets its own leaderboard and completion stats.

🏆 Achievements & Flairs

Earnable titles like “Novice Solver”, “Quick Thinker”, “Puzzle Master”.

Claimable flairs tied directly to achievements.

Flair selection integrated into a clean Achievements screen.

🎨 Realistic Puzzle Pieces

Interlocking tabs and sockets with randomized shapes.

Beveled edges, soft shadows, and hover animations for tactile depth.

Smooth snapping and glow feedback when placing pieces.

🕹️ Game Modes

Leisure: Relaxed play, no timer, progressive unlocks.

Timed: Competitive scoring with time and move tracking.

Daily & Community: Fresh puzzles and player-created challenges.

🧰 Under the Hood

Devvit + Kiro Framework for seamless Reddit integration.

Redis backend for leaderboard and state storage.

Reddit CDN for hosting official puzzles, user submissions, and music.

Phaser.js engine for real-time puzzle rendering.

💬 Community Experience

The game lives inside Reddit:

The main post showcases official puzzles and leaderboards.

Community submissions generate their own threads, encouraging play, discussion, and bragging rights.

Solve results automatically post comments with stats and flair progression.

🧑‍💻 Tech Stack
Component	Technology
Platform	Reddit + Devvit
Framework	Kiro
Game Engine	Phaser.js
Backend	Redis
Storage	Reddit CDN
Language	TypeScript
UX/UI	Canvas-based rendering + responsive layout
🧩 Gameplay Loop

Choose a puzzle (official or community).

Play and complete the puzzle with snapping, rotation, and animation.

Post your solve stats automatically to Reddit.

Earn flairs and achievements as you progress.

Create your own puzzles by uploading images via comments.

🚀 Developer Experience

Solved! leverages Kiro for automations that make Reddit app building faster and cleaner:

Automatic content routing and scheduling.

Preloading system for contextual post data.

Real-time triggers for comment-based image uploads.

CDN integration for assets and audio.

“Why didn’t I think of that?” — the Kiro ethos is fully realized in this build.

📅 Development Timeline
Day	Focus
Day 1	Base app setup & Reddit integration
Day 2	Puzzle rendering & game logic
Day 3	Official puzzles & difficulty progression
Day 4	Community puzzle system & leaderboards
Day 5	Flair and achievement systems
Day 6	Profile polish & UI mock integration
Day 7–10	Visual polish, performance, testing, submission prep
📜 License

MIT License © 2025 Enigma Games LLC
