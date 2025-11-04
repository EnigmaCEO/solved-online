# 🧩 Solved! — A Classic Jigsaw Puzzle Game for Reddit

Solved! is an immersive jigsaw puzzle game built with Phaser.js that runs natively on Reddit through the Devvit platform. Experience the satisfaction of solving beautiful puzzles with realistic interlocking pieces, complete with achievements, progression systems, and community features.

## 🎮 What is Solved!?

Solved! transforms traditional jigsaw puzzles into an interactive digital experience that combines:

- **Realistic Puzzle Mechanics**: Authentic jigsaw pieces with interlocking tabs and blanks using the CutJigsawImage plugin, rotation controls, and satisfying snap-to-grid placement
- **Progressive Difficulty System**: Four difficulty levels (Easy: 20 pieces, Medium: 35 pieces, Hard: 63 pieces, Expert: 108 pieces) that unlock as you complete previous difficulties  
- **Achievement & Flair System**: Earn Reddit flairs by completing achievements like "🧩 Novice Solver", "⚡ Quick Thinker", and "👑 Puzzle Master"
- **Community Integration**: Submit images via comments to create custom puzzles, share completion stats, and compete on leaderboards
- **Immersive Audio-Visual Experience**: Dynamic background music, visual effects, glow animations, and polished UI with mobile optimization

The game features six main scenes accessible from an animated main menu:
- **Main Menu**: Animated character carousel with user profile display and game mode selection
- **Puzzle of the Day**: Featured daily challenge with preset difficulty
- **Leisure Mode**: Gallery of 8 curated puzzles across 4 difficulty levels with progression system
- **Profile**: Comprehensive statistics, progress tracking, and Reddit flair management
- **Achievements**: 10 unlockable achievements with Reddit flair integration
- **Solve Scene**: The core puzzle-solving experience with authentic jigsaw mechanics

## 🌟 What Makes Solved! Innovative?

### First-of-its-Kind Reddit Integration
- **Native Reddit Experience**: Runs directly within Reddit posts - no external websites or downloads required
- **Seamless Authentication**: Uses your existing Reddit account - no separate registration or login process
- **Social Gaming**: Comment, share, and compete with other Reddit users in the same ecosystem where you already spend time
- **Reddit Flair Integration**: Achievements unlock actual Reddit flairs that display in the subreddit

### Authentic Jigsaw Experience
- **Real Puzzle Pieces**: Generated using the CutJigsawImage plugin with randomized interlocking shapes, tabs, and blanks that create authentic jigsaw piece shapes
- **Intuitive Controls**: Drag-and-drop pieces, click-to-place on grid, arrow key navigation (← →), and rotation controls (90° increments)  
- **Visual Feedback**: Glow effects, smooth animations, satisfying placement sounds, and visual streak indicators create tactile satisfaction
- **Peek Feature**: Camera button shows the complete image for 2 seconds with cooldown to maintain challenge
- **Smart Piece Navigation**: Automatic advancement to next unplaced piece after successful placement with throttled navigation controls

### Smart Progression System
- **Difficulty Gating**: Complete ALL puzzles in one difficulty to unlock the next (Easy → Medium → Hard → Expert)
- **Adaptive Piece Counts**: Mobile users get optimized piece counts (max 63 pieces) for better playability
- **Star Rating System**: Earn 1-5 stars based on completion time, accuracy, perfect streaks, and score performance
- **Scoring System**: 5 points per correct piece with streak multipliers, penalties for wrong placements

### Revolutionary Community Features
- **User-Generated Content**: Submit any image via Reddit comment to instantly create a playable puzzle
- **Automatic Processing**: Advanced image validation (200×200 to 2048×2048 pixels, aspect ratio 0.5-2.0), difficulty assignment, and duplicate detection
- **Smart Moderation**: Intelligent comment filtering keeps puzzle submissions organized while allowing social interaction on puzzle posts
- **Instant Publishing**: Approved puzzles become new Reddit posts with leaderboards and social features
- **Share Solve Stats**: Post completion times and scores directly to Reddit with formatted statistics

### Technical Innovation
- **Serverless Architecture**: Built on Devvit's cutting-edge serverless platform with Redis persistence and automatic scaling
- **Advanced Image Processing**: Real-time image validation, aspect ratio calculation, and difficulty assignment with duplicate detection
- **CDN Integration**: Puzzle images and audio hosted on Reddit's CDN for instant loading worldwide with MediaManager utility
- **Cross-Platform Excellence**: Responsive design works seamlessly on desktop and mobile browsers with touch optimization
- **Real-Time Sync**: Progress and achievements sync across devices via Reddit authentication
- **Achievement System**: 10 unlockable achievements with automatic Reddit flair integration and progress tracking

### Game Architecture & Scenes
- **Phaser.js Engine**: Built with the powerful Phaser 3 game engine for smooth 2D graphics and animations
- **Scene-Based Architecture**: Seven distinct game scenes (Boot, Preloader, MainMenu, Solve, Leisure, Profile, Achievements, GameOver) with seamless transitions
- **Responsive Canvas**: Dynamic scaling and layout adjustment for all screen sizes and orientations
- **Asset Management**: Intelligent media loading with CDN fallbacks, local asset support, and MediaManager utility class
- **Community Puzzle Detection**: Automatic detection and routing for community-submitted puzzles via Preloader scene

## 🎯 How to Play Solved!

### Getting Started
1. **Launch the Game**: Click the "Play Now" button on any Solved! Reddit post to open the full-screen game
2. **Choose Your Mode**: 
   - **Puzzle of the Day**: Try the featured Saturn puzzle (7×5 grid, medium difficulty)
   - **Leisure Mode**: Browse and play from the full puzzle gallery with 8 built-in puzzles
   - **Profile**: View your stats, achievements, and manage Reddit flairs
   - **Achievements**: Browse unlocked achievements and set Reddit flairs

### Main Menu Navigation
The main menu features an animated character carousel (girl, boy, man) that cycles every few seconds with fade transitions. The interface includes:
- **User Profile Display**: Shows your Reddit username (u/username), rank, stars earned, and puzzles completed
- **Six Game Modes**: Each represented by themed buttons with hover animations
- **Background Music**: Atmospheric music that plays throughout the menu experience
- **Responsive Layout**: Automatically adapts to different screen sizes and orientations

### Game Modes Explained
1. **Puzzle of the Day** (Daily Challenge): Featured Saturn puzzle (7×5 grid, medium difficulty) with preset configuration
2. **Leisure Mode** (Gallery): Browse and select from 8 curated puzzles across 4 difficulty levels with progression unlocking
3. **Community Challenges**: Play user-submitted puzzles created from Reddit image comments (when available)
4. **Profile**: Detailed statistics, progress tracking, and Reddit flair management with achievement integration
5. **Achievements**: View and unlock 10 different achievements with direct Reddit flair setting functionality
6. **Adventure Mode**: Future expansion for story-driven puzzle campaigns (currently placeholder)

### Playing a Puzzle
1. **Select a Puzzle**: In Leisure mode, choose from available puzzles (locked puzzles require completing previous difficulties)
2. **Understand the Interface**:
   - **Puzzle Grid**: The outlined area where pieces snap into place with visual grid lines and interactive click areas
   - **Current Piece Display**: Shows the piece you're currently placing with glow effects positioned at the bottom of the screen
   - **Navigation Arrows**: Use ← → buttons or arrow keys to cycle through unplaced pieces
   - **Rotation Controls**: Use rotation buttons to turn pieces 90° increments (disabled in Easy mode and mobile)
   - **Peek Button**: Camera icon shows the complete puzzle image for 2 seconds (2-second cooldown prevents overuse)
   - **Progress Bar**: Visual indicator showing completion percentage with animated fill and piece counter
   - **Timer**: Tracks your solve time for scoring and achievements (displayed in top-right corner)
   - **Score Display**: Shows current score and streak multiplier (left side of screen)
   - **Piece Counter**: Shows current progress (e.g., "Progress: 15/35") below the puzzle grid
   - **Back Button**: Return to main menu at any time (top-left corner)
   - **Instructions**: Context-sensitive help text at the bottom of the screen for mobile and desktop users

### Piece Placement Methods
1. **Drag and Drop**: Drag pieces from the display area to the grid (works on mobile and desktop)
   - Pieces glow cyan when being dragged with scale animation (1.1x larger)
   - Drop within snap distance (80 pixels desktop, 100 pixels mobile) of correct slot to place
   - Pieces return to display if dropped incorrectly or too far from grid
   - Authentic jigsaw pieces with interlocking tabs and blanks generated by CutJigsawImage plugin
2. **Click to Place**: Click on a grid square to attempt placing the current piece
   - Only works if piece is in correct position and has 0° rotation
   - Immediate feedback with visual and audio cues
   - Grid slots are clearly outlined with interactive click areas
3. **Piece Navigation**: 
   - Use left/right arrow buttons or keyboard arrow keys to cycle through unplaced pieces
   - Only unplaced pieces are shown in the navigation cycle
   - Current piece is highlighted with glow effects and positioned at bottom of screen
   - Navigation is throttled (100ms cooldown) to prevent rapid-fire calls
4. **Rotation Controls**: 
   - Left and right rotation buttons turn pieces 90° increments
   - Rotation is disabled on Easy difficulty and mobile devices for simplicity
   - Pieces must be at 0° rotation to be placed correctly in grid
   - Visual rotation feedback shows piece orientation changes
5. **Correct Placement Requirements**: 
   - Piece must be in correct grid position (matching correctRow and correctCol)
   - Piece must have 0° rotation (no rotation allowed for correct placement)
   - Visual and audio feedback confirms correct placement with satisfying snap sound
6. **Visual Feedback**: 
   - ✅ Correct placements: Satisfying snap animation with scale bounce, success sound, piece locks in place with glow effect
   - ❌ Wrong placements: Visual feedback at attempted location, error sound, piece returns to display
   - 🔄 Pieces can be rotated before placement (except in Easy mode and mobile)
   - 👁️ Peek feature shows complete image overlay for strategic reference

### Authentic Jigsaw Mechanics
- **Real Interlocking Pieces**: Uses CutJigsawImage plugin to generate authentic puzzle pieces with tabs and blanks
- **Randomized Shapes**: Each piece has unique interlocking edges that fit only with adjacent pieces
- **Realistic Physics**: Pieces have proper collision detection and snap-to-grid behavior with satisfying placement feedback
- **Visual Depth**: Glow effects, shadows, and scale animations create realistic piece appearance and tactile satisfaction
- **Rotation System**: Pieces can be rotated in 90° increments (disabled in Easy mode and mobile for accessibility)
- **Piece Shuffling**: Pieces are randomly shuffled and rotated at puzzle start for variety and challenge
- **Smart Navigation**: Automatic advancement to next unplaced piece after successful placement

### Scoring System
- **Base Points**: 5 points per correctly placed piece
- **Streak Multiplier**: Consecutive correct placements multiply your score (visible streak counter)
- **Penalties**: Wrong placements break your streak and deduct 25 points
- **Time Bonus**: Faster completion times contribute to higher star ratings
- **Perfect Completion**: No wrong placements earns special recognition and trophy badge

### Star Rating System (1-5 Stars)
Stars are awarded based on multiple performance factors:
- **Base Star**: 1 star for completion
- **Time Bonus**: +1 star for under 60 seconds, +0.5 for under 120 seconds
- **Perfect Bonus**: +1 star for no incorrect placements
- **Score Bonus**: +1 star for 1000+ points, +0.5 for 500+ points
- **Maximum**: 5 stars total per puzzle

### Progression & Unlocks
1. **Start with Easy**: 8 Easy puzzles (20 pieces each) - all unlocked from the start
2. **Unlock Medium**: Complete ALL Easy puzzles to access Medium difficulty (35 pieces)
3. **Unlock Hard**: Complete ALL Medium puzzles to access Hard difficulty (63 pieces)  
4. **Unlock Expert**: Complete ALL Hard puzzles to access Expert difficulty (108 pieces)
5. **Earn Achievements**: Complete specific challenges to unlock Reddit flairs

### Built-in Puzzle Gallery (8 Puzzles Available)
The game includes 8 carefully curated puzzles across different themes, all starting at Easy difficulty:
- **🌊 Waterfall**: Nature scene with flowing water (Easy, 20 pieces - 5×4 grid)
- **🌲 Forest Path**: Peaceful woodland trail (Easy, 20 pieces - 5×4 grid)
- **🏖️ Tropical Beach**: Ocean paradise with palm trees (Easy, 20 pieces - 5×4 grid)
- **🏔️ Mountain Vista**: Majestic mountain landscape (Easy, 20 pieces - 5×4 grid)
- **🪐 Saturn**: Stunning planet with rings (Easy, 20 pieces - 5×4 grid)
- **🌌 Galaxy Spiral**: Cosmic spiral galaxy (Easy, 20 pieces - 5×4 grid)
- **🏞️ Peaceful Lake**: Serene lake reflection (Easy, 20 pieces - 5×4 grid)
- **🏙️ City Skyline**: Urban cityscape at sunset (Easy, 20 pieces - 5×4 grid)

**Progression System**: All puzzles start unlocked at Easy difficulty. Complete ALL Easy puzzles to unlock Medium (35 pieces, 5×7 grid), then ALL Medium to unlock Hard (63 pieces, 7×9 grid), then ALL Hard to unlock Expert (108 pieces, 9×12 grid). Each difficulty increases piece count and complexity while maintaining the same beautiful imagery.

### Achievement System (10 Achievements Available)
Each achievement unlocks a Reddit flair that can be set directly from the Achievements scene:
- **🧩 Novice Solver**: Complete your first puzzle (unlocks "🧩 Novice Solver" flair)
- **⚡ Quick Thinker**: Solve a puzzle in under 2 minutes (unlocks "⚡ Quick Thinker" flair)
- **⭐ Perfect Solver**: Complete a puzzle with no wrong placements (unlocks "⭐ Perfect Solver" flair)
- **🌱 Easy Master**: Complete all easy difficulty puzzles (unlocks "🌱 Easy Master" flair)
- **🔥 Medium Master**: Complete all medium difficulty puzzles (unlocks "🔥 Medium Master" flair)
- **💎 Hard Master**: Complete all hard difficulty puzzles (unlocks "💎 Hard Master" flair)
- **👑 Puzzle Master**: Complete all expert difficulty puzzles (unlocks "👑 Puzzle Master" flair)
- **🧠 Community Creator**: Submit an image that becomes a community puzzle (unlocks "🧠 Community Creator" flair)
- **🎯 Puzzle Enthusiast**: Complete 10 puzzles total (unlocks "🎯 Puzzle Enthusiast" flair)
- **🌟 Star Collector**: Earn 50 total stars (unlocks "🌟 Star Collector" flair)

**Flair Integration**: Click any unlocked achievement to set it as your Reddit flair in the subreddit. The Achievements scene shows progress bars, unlock dates, and provides direct flair management.

### Profile & Statistics
The Profile scene provides comprehensive tracking with a clean, organized interface:
- **Basic Stats**: Reddit username (u/username), rank, total stars earned, puzzles completed
- **Performance Grid**: Six-stat layout showing puzzles completed, total stars, best time, total time played, average moves, and completion rate
- **Progress Visualization**: Animated progress bar showing overall completion percentage
- **Reddit Flair Management**: Current flair display with available flair count and direct access to Achievements scene
- **Achievement Integration**: Direct link to view and manage all unlocked achievements and set Reddit flairs
- **Responsive Design**: Stats grid adapts to mobile and desktop layouts with appropriate scaling

### Community Features
1. **Submit Custom Puzzles**: Upload images in Reddit comments on main app posts
2. **Automatic Processing**: Images are validated with strict requirements:
   - Size: 200×200 to 2048×2048 pixels
   - Aspect ratio: Between 0.5 and 2.0 (prevents extreme rectangles)
   - Format: JPEG, PNG, or WebP only
   - Automatic difficulty assignment based on image complexity
3. **Instant Puzzle Creation**: Approved images become playable puzzles with their own Reddit posts
4. **Smart Moderation**: 
   - Non-image comments on main app posts are automatically removed
   - Duplicate image detection prevents the same image being submitted twice
   - Rate limiting and retry logic for comment processing
5. **Share Completion Stats**: Post your solve times and scores to Reddit automatically with formatted stats
6. **Compete on Leaderboards**: See how you rank against other players with persistent Redis-based scoring
7. **Social Interaction**: Comment and discuss puzzles on individual puzzle posts (social comments allowed)
8. **Achievement Integration**: Submitting approved community puzzles unlocks special achievements and flairs

### Mobile Optimization
- **Touch Controls**: Optimized for mobile with larger touch targets and gesture support
- **Simplified Interface**: Streamlined UI for smaller screens with repositioned controls
- **Reduced Complexity**: Mobile caps at Hard difficulty (63 pieces max) for better playability
- **Adaptive Settings**: 
  - Rotation disabled on mobile for simpler gameplay
  - Increased snap distance (100px vs 80px) for easier piece placement
  - Larger button sizes and touch areas
- **Responsive Design**: UI elements automatically adjust for different screen sizes and orientations
- **Performance Optimization**: Reduced visual effects and optimized rendering for mobile devices

### Technical Architecture
- **Frontend**: Phaser.js 3D game engine with TypeScript for type safety and robust puzzle mechanics
- **Backend**: Express.js serverless functions running on Devvit platform with Redis persistence
- **Database**: Redis for persistent data storage (user progress, achievements, leaderboards, community puzzles)
- **Authentication**: Seamless Reddit OAuth integration through Devvit - no separate login required
- **Asset Management**: CDN-hosted puzzle images and audio files with automatic upload and caching
- **Real-time Features**: Server-side puzzle validation, automatic post creation, and comment processing
- **Cross-Platform**: Responsive canvas-based rendering works on all modern browsers with mobile optimization
- **Jigsaw Engine**: Advanced piece cutting using CutJigsawImage plugin for authentic interlocking shapes

### Advanced Features
- **Dynamic Background Music**: Multiple OGG tracks (bg1.ogg, bg2.ogg, bg3.ogg, t1.ogg, t2.ogg, t3.ogg) that change between puzzles and scenes
- **Visual Effects**: Glow effects, smooth animations, satisfying placement animations, and scale transitions
- **Keyboard Controls**: Full keyboard support with arrow keys for piece navigation and rotation controls
- **Auto-Save Progress**: Progress automatically saves to Reddit account via server API with Redis persistence
- **Peek Cooldown System**: Strategic peek feature with 2-second cooldown and visual feedback to maintain challenge balance
- **Piece Shuffling**: Pieces are randomly shuffled and rotated (0°, 90°, 180°, 270°) each game for variety
- **Completion Animations**: Special victory screens with star displays, perfect completion badges, and community puzzle sharing
- **Adaptive UI**: Interface automatically adjusts for mobile vs desktop with optimized touch controls and button sizing
- **Real Jigsaw Physics**: Authentic piece shapes with tabs and blanks generated by CutJigsawImage plugin
- **Progress Tracking**: Detailed statistics including streaks, completion rates, performance analytics, and achievement progress
- **Scene Management**: Seamless transitions between Boot, Preloader, MainMenu, Solve, Leisure, Profile, and Achievements scenes
- **Asset Management**: Intelligent CDN integration with local fallbacks via MediaManager utility class

### Tips for Success
- **Use the Peek Feature**: The camera button shows the complete image - use it strategically (2-second cooldown prevents overuse)
- **Master the Controls**: Learn both drag-and-drop and click-to-place methods for efficient piece placement
- **Rotation Strategy**: Try all 4 rotations (0°, 90°, 180°, 270°) systematically if a piece seems like it should fit
- **Build Streaks**: Focus on accuracy over speed to build scoring multipliers (5 points × streak) and avoid penalties (-25 points)
- **Start with Easy**: Master the controls and mechanics on Easy puzzles (no rotation, 20 pieces) before advancing
- **Community Participation**: Submit high-quality images (200×200 to 2048×2048 pixels, aspect ratio 0.5-2.0) to become a Community Creator
- **Navigation Efficiency**: Use arrow keys or navigation buttons to quickly cycle through unplaced pieces
- **Mobile Optimization**: On mobile, rotation is disabled and snap distance is increased for easier gameplay
- **Achievement Focus**: Work toward specific achievements to unlock Reddit flairs and show your puzzle-solving prowess
- **Progress Strategy**: Complete ALL puzzles in one difficulty before the next unlocks (Easy → Medium → Hard → Expert)

## 🏗️ Game Architecture & Scenes

### Scene Structure
The game is built with a modular scene-based architecture using Phaser.js:

1. **Boot Scene**: Initial loading and basic asset setup
2. **Preloader Scene**: Asset loading with community puzzle detection and automatic scene routing
3. **MainMenu Scene**: Animated main hub with character carousel, user profile, and game mode selection
4. **Solve Scene**: Core puzzle-solving experience with authentic jigsaw mechanics and comprehensive UI
5. **Leisure Scene**: Puzzle gallery with difficulty-based progression, category filtering, and unlock system
6. **Profile Scene**: User statistics, achievement progress, and Reddit flair management
7. **Achievements Scene**: Achievement browser with progress tracking and direct flair setting

### Key Technical Features
- **Responsive Canvas**: Dynamic scaling and layout adjustment for all screen sizes and orientations
- **Asset Management**: MediaManager utility handles CDN integration with local fallbacks
- **Jigsaw Engine**: CutJigsawImage plugin generates authentic interlocking puzzle pieces
- **State Management**: Redis-based persistence with automatic progress syncing
- **Community Integration**: Automatic puzzle creation from Reddit image comments
- **Achievement System**: Real-time achievement checking with Reddit flair integration

## 🧑‍💻 Tech Stack

| Component | Technology |
|-----------|------------|
| Platform | Reddit + Devvit |
| Game Engine | Phaser.js 3 |
| Backend | Express.js + Redis |
| Language | TypeScript |
| Build Tool | Vite |
| UI/UX | Canvas-based rendering + responsive layout |
| Puzzle Engine | CutJigsawImage plugin |
| Asset Management | CDN integration + local fallbacks |

## 🚀 Development

### Prerequisites
- Node.js 22.2.0 or higher
- Reddit Developer Account
- Devvit CLI installed

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd solved-online

# Install dependencies
npm install

# Start development server
npm run dev
```

### Testing
```bash
# Run the development server
npm run dev

# Open the playtest URL provided by Devvit
# Example: https://www.reddit.com/r/solved-online_dev?playtest=solved-online
```

### Deployment
```bash
# Build for production
npm run build

# Deploy to Reddit
npm run deploy

# Publish for review
npm run launch
```

## 📜 License

MIT License © 2025

---

The game combines the meditative satisfaction of traditional jigsaw puzzles with modern gaming elements like achievements, progression, and social features - all seamlessly integrated into the Reddit experience!
