# Community Puzzle System

## Overview

The community puzzle system allows Reddit users to create custom puzzles by submitting images in comments. The system automatically processes submissions, validates images, and creates playable puzzles.

## How It Works

### For Users (Puzzle Creators)

1. **Submit a Puzzle**: Comment on any post with an image attachment
2. **Automatic Processing**: The system detects the image and begins validation
3. **Validation**: Images are checked for:
   - Valid format (JPEG, PNG, WebP)
   - Appropriate dimensions (200x200 to 2048x2048 pixels)
   - Reasonable aspect ratio (0.5 to 2.0)
4. **Approval/Rejection**: Users receive a reply with the status
5. **Post Creation**: Approved puzzles get their own dedicated post

### For Players (Puzzle Solvers)

1. **Browse Community Puzzles**: Use the "Community Puzzles" button in the main menu
2. **Play Directly**: Click on community puzzle posts to play immediately
3. **Leaderboards**: Compete with other players on puzzle-specific leaderboards
4. **Share Results**: Use the "Share my Solve! 🎉" button to post your completion stats
5. **Social Interaction**: Comment and discuss on individual puzzle posts

## Technical Implementation

### Server-Side Processing

- **Official Post Tracking**: Post IDs saved during app installation and manual post creation
- **Comment Triggers**: `onCommentCreate` and `onCommentSubmit` detect new submissions
- **Post Type Detection**: System distinguishes official app posts from community puzzle posts
- **Image Validation**: Comprehensive validation of format, dimensions, and aspect ratio
- **Difficulty Assignment**: Automatic difficulty based on image complexity
- **Redis Storage**: All puzzle data stored with organized key structure
- **Post Creation**: Automatic creation of dedicated puzzle posts
- **Comment Management**: Non-image comments on official posts are removed with helpful messages

### Client-Side Features

- **Community Browser**: View and select from approved community puzzles
- **Dynamic Loading**: Puzzles load directly from Reddit CDN
- **Progress Tracking**: Separate leaderboards for each community puzzle
- **Result Sharing**: Automatic comment creation with completion stats

### Data Structure

```
Redis Keys:
- community:puzzle:{puzzleId} - Individual puzzle data
- community:puzzles:list - List of all puzzle IDs
- puzzle:leaderboard:{puzzleId}:{postId} - Puzzle-specific leaderboards
- community:completion:{puzzleId}:{postId}:{username}:{timestamp} - Individual completions
```

### Validation Rules

- **Image Formats**: JPEG, PNG, WebP only
- **Dimensions**: 200x200 to 2048x2048 pixels
- **Aspect Ratio**: Between 0.5 and 2.0 (prevents extreme rectangles)
- **File Size**: Handled by Reddit's media upload limits

### Difficulty Assignment

- **Easy**: < 300,000 pixels (e.g., 500x600)
- **Medium**: 300,000 - 600,000 pixels (e.g., 800x600)
- **Hard**: 600,000 - 1,200,000 pixels (e.g., 1000x1000)
- **Expert**: > 1,200,000 pixels (e.g., 1400x1000)

## API Endpoints

- `GET /api/community-puzzles` - List all community puzzles
- `GET /api/community-puzzle/:postId` - Get puzzle data for specific post
- `POST /api/community-puzzle-complete` - Save completion and post comment
- `POST /api/share-solve` - Share solve stats as comment on puzzle post
- `POST /internal/on-comment-create` - Process new comment submissions
- `POST /internal/on-comment-submit` - Alternative comment processing
- `GET /api/debug/official-posts` - Debug endpoint to view official app posts

## User Experience Flow

1. **Submission**: User posts image in comment → Immediate "processing" reply
2. **Validation**: System validates image → Approval/rejection reply
3. **Post Creation**: Approved puzzle gets dedicated post with custom splash screen
4. **Gameplay**: Players solve puzzle with normal game mechanics
5. **Completion**: Results posted as comment + leaderboard update
6. **Discovery**: Other users can browse and play community puzzles

## Error Handling

- Invalid images receive detailed rejection reasons
- Network errors show user-friendly messages
- Fallback to default puzzles if community puzzles fail to load
- Graceful degradation for missing puzzle data

## Share My Solve Feature

### How It Works
1. **Complete a Community Puzzle** - Finish any community-submitted puzzle
2. **Click "Share my Solve! 🎉"** - Button appears only for community puzzles
3. **Automatic Comment** - Your stats are posted as a comment on the puzzle post
4. **Community Engagement** - Other players can see and react to your achievement

### Shared Information
- **Completion Time** - How long it took to solve
- **Move Count** - Number of pieces moved
- **Puzzle Title** - Which puzzle was completed
- **Celebration Message** - Encouraging message for the community

### Example Share Comment
```
🧩 **Puzzle Solved!** 🎉

📊 **My Stats:**
⏱️ Time: 2m 34s
🔄 Moves: 45
🎯 Puzzle: "Beautiful Sunset"

Great puzzle! 👏
```

### Benefits
- **Community Building** - Players can celebrate achievements together
- **Motivation** - Seeing others' stats encourages more play
- **Social Proof** - Shows puzzle quality through completion rates
- **Engagement** - Drives comments and interaction on puzzle posts

## Future Enhancements

- Puzzle categories and tags
- User ratings and favorites
- Advanced image processing for better difficulty detection
- Puzzle contests and featured submissions
- Integration with user profiles and achievements
