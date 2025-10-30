import express from 'express';
import {
  InitResponse,
  IncrementResponse,
  DecrementResponse,
  PuzzleCompletionData,
  PuzzleCompletionResponse,
  LeaderboardResponse,
  UserResponse,
  UserProfile,
  UserProgressData,
  SaveProgressRequest,
  SaveProgressResponse,
  CommunityPuzzleSubmission,
  PuzzleValidationResult,
  CommunityPuzzleResponse,
  CommunityPuzzleListResponse,
  Achievement,
  AchievementResponse,
  FlairResponse,
  ProfileStats,
  ExtendedUserProfile,
} from '../shared/types/api';
import { redis, createServer, context } from '@devvit/web/server';
import { reddit } from '@devvit/reddit';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const count = await redis.get('count');
      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

// Store puzzle completion data
router.post<
  Record<string, never>,
  PuzzleCompletionResponse,
  PuzzleCompletionData & { puzzleId?: string }
>('/api/puzzle-complete', async (req, res): Promise<void> => {
  const { postId, userId } = context;

  if (!postId) {
    res.status(400).json({
      status: 'error',
      message: 'postId is required',
    });
    return;
  }

  try {
    const { time, moves, puzzleId } = req.body;

    if (typeof time !== 'number' || typeof moves !== 'number') {
      res.status(400).json({
        status: 'error',
        message: 'Invalid time or moves data',
      });
      return;
    }

    // Store completion data in Redis
    const completionData = {
      time,
      moves,
      userId: userId || 'anonymous',
      timestamp: Date.now(),
      postId,
      puzzleId: puzzleId || 'default',
    };

    // Use puzzle-specific keys for better organization
    const puzzleKey = puzzleId || 'default';

    // Store individual completion
    const completionKey = `puzzle:completion:${puzzleKey}:${postId}:${Date.now()}`;
    await redis.set(completionKey, JSON.stringify(completionData));

    // Update leaderboard (best times) - separate leaderboard per puzzle
    const leaderboardKey = `puzzle:leaderboard:${puzzleKey}:${postId}`;
    await redis.zAdd(leaderboardKey, { score: time, member: JSON.stringify(completionData) });

    // Keep only top 10 scores
    await redis.zRemRangeByRank(leaderboardKey, 10, -1);

    // Update user's best time for this specific puzzle
    if (userId) {
      const userBestKey = `puzzle:user:${userId}:${puzzleKey}:best`;
      const currentBest = await redis.get(userBestKey);

      if (!currentBest || time < parseInt(currentBest)) {
        await redis.set(userBestKey, time.toString());
      }

      // Check for achievements
      const currentUser = await reddit.getCurrentUser();
      if (currentUser) {
        const newAchievements = await checkAchievements(currentUser.username, {
          type: 'puzzle_complete',
          puzzleId: puzzleKey,
          time,
          perfect: req.body.perfectCompletion,
          difficulty: req.body.difficulty || 'medium',
        });

        // Post achievement comments for newly unlocked achievements
        for (const achievement of newAchievements) {
          await postAchievementComment(currentUser.username, achievement);
        }
      }
    }

    res.json({
      status: 'success',
      message: 'Puzzle completion recorded',
    });
  } catch (error) {
    console.error('Error storing puzzle completion:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to store completion data',
    });
  }
});

// Get leaderboard data
router.get<Record<string, never>, LeaderboardResponse>(
  '/api/leaderboard',
  async (req, res): Promise<void> => {
    const { postId } = context;
    const puzzleId = (req.query.puzzleId as string) || 'default';

    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    try {
      const leaderboardKey = `puzzle:leaderboard:${puzzleId}:${postId}`;
      const topScores = await redis.zRange(leaderboardKey, 0, 9);

      const leaderboard = topScores.map(
        (item: { member: string; score: number }, index: number) => {
          const data = JSON.parse(item.member);
          return {
            rank: index + 1,
            time: data.time,
            moves: data.moves,
            userId: data.userId,
            timestamp: data.timestamp,
          };
        }
      );

      res.json({
        status: 'success',
        leaderboard,
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch leaderboard',
      });
    }
  }
);

// Debug endpoint to view official app posts
router.get('/api/debug/official-posts', async (_req, res): Promise<void> => {
  try {
    const appPostsKey = 'official:app:posts';
    const appPostsData = await redis.get(appPostsKey);
    const officialPostIds = appPostsData ? JSON.parse(appPostsData) : [];

    res.json({
      status: 'success',
      officialPostIds,
      count: officialPostIds.length,
    });
  } catch (error) {
    console.error('Error fetching official posts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch official posts',
    });
  }
});

// Auto-upload all puzzle images from assets/Puzzles directory
router.post('/api/auto-upload-puzzles', async (_req, res): Promise<void> => {
  try {
    // Map the actual PNG files in the Puzzles directory to puzzle data
    const defaultPuzzles = [
      { filename: '0-0.png', puzzleId: 'nature-waterfall', title: 'Waterfall' },
      { filename: '0-1.png', puzzleId: 'nature-forest', title: 'Forest Path' },
      { filename: '0-2.png', puzzleId: 'ocean-beach', title: 'Tropical Beach' },
      { filename: '0-3.png', puzzleId: 'landscape-mountain', title: 'Mountain Vista' },
      { filename: '0-4.png', puzzleId: 'space-saturn', title: 'Saturn' },
      { filename: '0-5.png', puzzleId: 'space-galaxy', title: 'Galaxy Spiral' },
      { filename: '0-6.png', puzzleId: 'nature-lake', title: 'Peaceful Lake' },
      { filename: '0-7.png', puzzleId: 'city-skyline', title: 'City Skyline' },
    ];

    const uploadResults = [];

    for (const puzzle of defaultPuzzles) {
      try {
        // Construct the local asset path
        const localPath = `assets/Puzzles/${puzzle.filename}`;

        // In a real implementation, you would read the file and upload to CDN
        // For now, we'll use the local path as the CDN URL
        const cdnUrl = localPath;

        // Store the CDN URL in Redis
        const mediaKey = `puzzle:media:${puzzle.puzzleId}`;
        await redis.set(
          mediaKey,
          JSON.stringify({
            cdnUrl,
            originalPath: localPath,
            uploadedAt: Date.now(),
            puzzleId: puzzle.puzzleId,
          })
        );

        // Add to tracking list
        const imageListKey = 'puzzle:media:list';
        const currentList = await redis.get(imageListKey);
        const puzzleIds = currentList ? JSON.parse(currentList) : [];
        if (!puzzleIds.includes(puzzle.puzzleId)) {
          puzzleIds.push(puzzle.puzzleId);
          await redis.set(imageListKey, JSON.stringify(puzzleIds));
        }

        uploadResults.push({
          puzzleId: puzzle.puzzleId,
          filename: puzzle.filename,
          cdnUrl,
          status: 'success',
        });
      } catch (error) {
        uploadResults.push({
          puzzleId: puzzle.puzzleId,
          filename: puzzle.filename,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      status: 'success',
      message: `Processed ${defaultPuzzles.length} puzzle images`,
      results: uploadResults,
    });
  } catch (error) {
    console.error('Error auto-uploading puzzle images:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to auto-upload puzzle images',
    });
  }
});

// Upload puzzle image to Reddit CDN
router.post('/api/upload-puzzle-image', async (req, res): Promise<void> => {
  try {
    const { imageUrl, puzzleId } = req.body;

    if (!imageUrl || !puzzleId) {
      res.status(400).json({
        status: 'error',
        message: 'imageUrl and puzzleId are required',
      });
      return;
    }

    // Fetch the image from the provided URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      res.status(400).json({
        status: 'error',
        message: 'Failed to fetch image from URL',
      });
      return;
    }

    // Upload to Reddit CDN using media upload
    // Note: This is a placeholder - check Devvit docs for actual media upload API
    const uploadResult = { mediaUrl: imageUrl }; // Fallback for now

    // Store the CDN URL in Redis for future reference
    const mediaKey = `puzzle:media:${puzzleId}`;
    await redis.set(
      mediaKey,
      JSON.stringify({
        cdnUrl: uploadResult.mediaUrl,
        originalUrl: imageUrl,
        uploadedAt: Date.now(),
        puzzleId,
      })
    );

    // Add to tracking list (using simple string list for compatibility)
    const imageListKey = 'puzzle:media:list';
    const currentList = await redis.get(imageListKey);
    const puzzleIds = currentList ? JSON.parse(currentList) : [];
    if (!puzzleIds.includes(puzzleId)) {
      puzzleIds.push(puzzleId);
      await redis.set(imageListKey, JSON.stringify(puzzleIds));
    }

    res.json({
      status: 'success',
      cdnUrl: uploadResult.mediaUrl,
      puzzleId,
    });
  } catch (error) {
    console.error('Error uploading puzzle image:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload image to CDN',
    });
  }
});

// Auto-upload all sound files from assets/Sounds directory
router.post('/api/auto-upload-sounds', async (_req, res): Promise<void> => {
  try {
    // Map existing sound files to track IDs (including both MP3 and OGG formats)
    const soundFiles = [
      // Background music (MP3 format)
      { filename: 'bg1.mp3', trackId: 'background-music-1', type: 'background' },
      { filename: 'bg2.mp3', trackId: 'background-music-2', type: 'background' },
      { filename: 'bg3.mp3', trackId: 'background-music-3', type: 'background' },

      // Theme music (MP3 format)
      { filename: 't1.mp3', trackId: 'theme-music-1', type: 'theme' },
      { filename: 't2.mp3', trackId: 'theme-music-2', type: 'theme' },
      { filename: 't3.mp3', trackId: 'theme-music-3', type: 'theme' },

      // Sound effects (WAV format)
      { filename: 'chime.wav', trackId: 'sound-chime', type: 'effect' },
      { filename: 'cursor.wav', trackId: 'sound-cursor', type: 'effect' },
      { filename: 'strike.wav', trackId: 'sound-strike', type: 'effect' },

      // OGG versions (if they exist)
      { filename: 'bg1.ogg', trackId: 'background-music-1-ogg', type: 'background' },
      { filename: 'bg2.ogg', trackId: 'background-music-2-ogg', type: 'background' },
      { filename: 'bg3.ogg', trackId: 'background-music-3-ogg', type: 'background' },
      { filename: 't1.ogg', trackId: 'theme-music-1-ogg', type: 'theme' },
      { filename: 't2.ogg', trackId: 'theme-music-2-ogg', type: 'theme' },
      { filename: 't3.ogg', trackId: 'theme-music-3-ogg', type: 'theme' },
    ];

    const uploadResults = [];

    for (const sound of soundFiles) {
      try {
        // Construct the local asset path
        const localPath = `assets/Sounds/${sound.filename}`;

        // In a real implementation, you would read the file and upload to CDN
        // For now, we'll use the local path as the CDN URL
        const cdnUrl = localPath;

        // Store the CDN URL in Redis
        const mediaKey = `music:media:${sound.trackId}`;
        await redis.set(
          mediaKey,
          JSON.stringify({
            cdnUrl,
            originalPath: localPath,
            uploadedAt: Date.now(),
            trackId: sound.trackId,
            type: sound.type,
            filename: sound.filename,
          })
        );

        // Add to tracking list
        const trackListKey = 'music:media:list';
        const currentList = await redis.get(trackListKey);
        const trackIds = currentList ? JSON.parse(currentList) : [];
        if (!trackIds.includes(sound.trackId)) {
          trackIds.push(sound.trackId);
          await redis.set(trackListKey, JSON.stringify(trackIds));
        }

        uploadResults.push({
          trackId: sound.trackId,
          filename: sound.filename,
          type: sound.type,
          cdnUrl,
          status: 'success',
        });
      } catch (error) {
        uploadResults.push({
          trackId: sound.trackId,
          filename: sound.filename,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      status: 'success',
      message: `Processed ${soundFiles.length} sound files`,
      results: uploadResults,
    });
  } catch (error) {
    console.error('Error auto-uploading sound files:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to auto-upload sound files',
    });
  }
});

// Upload background music to Reddit CDN
router.post('/api/upload-music', async (req, res): Promise<void> => {
  try {
    const { musicUrl, trackId } = req.body;

    if (!musicUrl || !trackId) {
      res.status(400).json({
        status: 'error',
        message: 'musicUrl and trackId are required',
      });
      return;
    }

    // Fetch the audio file from the provided URL
    const audioResponse = await fetch(musicUrl);
    if (!audioResponse.ok) {
      res.status(400).json({
        status: 'error',
        message: 'Failed to fetch audio from URL',
      });
      return;
    }

    // Upload to Reddit CDN using media upload
    // Note: This is a placeholder - check Devvit docs for actual media upload API
    const uploadResult = { mediaUrl: musicUrl }; // Fallback for now

    // Store the CDN URL in Redis for future reference
    const mediaKey = `music:media:${trackId}`;
    await redis.set(
      mediaKey,
      JSON.stringify({
        cdnUrl: uploadResult.mediaUrl,
        originalUrl: musicUrl,
        uploadedAt: Date.now(),
        trackId,
      })
    );

    // Add to tracking list (using simple string list for compatibility)
    const trackListKey = 'music:media:list';
    const currentList = await redis.get(trackListKey);
    const trackIds = currentList ? JSON.parse(currentList) : [];
    if (!trackIds.includes(trackId)) {
      trackIds.push(trackId);
      await redis.set(trackListKey, JSON.stringify(trackIds));
    }

    res.json({
      status: 'success',
      cdnUrl: uploadResult.mediaUrl,
      trackId,
    });
  } catch (error) {
    console.error('Error uploading music:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload music to CDN',
    });
  }
});

// Get all uploaded puzzle images
router.get('/api/puzzle-images', async (_req, res): Promise<void> => {
  try {
    // Get all puzzle media from Redis
    const puzzleImages = [];

    // Get list of uploaded puzzle IDs
    const imageListKey = 'puzzle:media:list';
    const imageListData = await redis.get(imageListKey);
    const imageIds = imageListData ? JSON.parse(imageListData) : [];

    for (const puzzleId of imageIds) {
      const mediaKey = `puzzle:media:${puzzleId}`;
      const mediaData = await redis.get(mediaKey);
      if (mediaData) {
        puzzleImages.push(JSON.parse(mediaData));
      }
    }

    res.json({
      status: 'success',
      images: puzzleImages,
    });
  } catch (error) {
    console.error('Error fetching puzzle images:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch puzzle images',
    });
  }
});

// Get all uploaded music tracks
router.get('/api/music-tracks', async (_req, res): Promise<void> => {
  try {
    // Get all music media from Redis
    const musicTracks = [];

    // Get list of uploaded track IDs
    const trackListKey = 'music:media:list';
    const trackListData = await redis.get(trackListKey);
    const trackIds = trackListData ? JSON.parse(trackListData) : [];

    for (const trackId of trackIds) {
      const mediaKey = `music:media:${trackId}`;
      const mediaData = await redis.get(mediaKey);
      if (mediaData) {
        musicTracks.push(JSON.parse(mediaData));
      }
    }

    res.json({
      status: 'success',
      tracks: musicTracks,
    });
  } catch (error) {
    console.error('Error fetching music tracks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch music tracks',
    });
  }
});

// Get current user profile and progress
router.get<Record<string, never>, UserResponse>('/api/user', async (_req, res): Promise<void> => {
  try {
    // Get current user from Devvit context
    const currentUser = await reddit.getCurrentUser();

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    const username = currentUser.username;

    // Get user progress from Redis
    const progressKey = `user:${username}:progress`;
    const progressData = await redis.get(progressKey);

    let progress: UserProgressData = {
      stars: 0,
      unlocks: ['nature-waterfall'], // Default first puzzle unlocked
      bestTimes: {},
      completedPuzzles: [],
      totalScore: 0,
    };

    if (progressData) {
      progress = JSON.parse(progressData);
    }

    // Calculate user stats for profile
    const totalStars = progress.stars;
    const puzzlesCompleted = progress.completedPuzzles.length;
    const bestTime = Math.min(...Object.values(progress.bestTimes), Infinity);

    // Calculate rank based on total stars (simple ranking system)
    // Note: Redis in Devvit doesn't support KEYS command, so we'll use a simpler approach
    // In a real implementation, you'd maintain a separate leaderboard sorted set
    const rank = 1; // Default rank for now

    const userProfile: UserProfile = {
      username,
      avatar: `https://www.reddit.com/user/${username}/avatar`, // Reddit avatar URL
      totalStars,
      puzzlesCompleted,
      bestTime: bestTime === Infinity ? 0 : bestTime,
      rank,
    };

    res.json({
      status: 'success',
      user: userProfile,
      progress,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile',
    });
  }
});

// Proxy user avatar to avoid CSP issues
router.get('/api/user/avatar', async (_req, res): Promise<void> => {
  try {
    const currentUser = await reddit.getCurrentUser();

    if (!currentUser) {
      res.status(404).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    // Try multiple avatar URL formats
    const avatarUrls = [
      `https://www.reddit.com/user/${currentUser.username}/avatar`,
      `https://styles.redditmedia.com/t5_${currentUser.id}/styles/profileIcon_snoo.png`,
      `https://www.redditstatic.com/avatars/defaults/v2/avatar_default_${Math.floor(Math.random() * 20) + 1}.png`,
    ];

    let avatarResponse: Response | null = null;

    // Try each avatar URL until one works
    for (const avatarUrl of avatarUrls) {
      try {
        console.log(`🔍 Trying avatar URL: ${avatarUrl}`);
        const response = await fetch(avatarUrl);
        if (response.ok) {
          avatarResponse = response;
          console.log(`✅ Avatar found: ${avatarUrl}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Avatar URL failed: ${avatarUrl}`);
        continue;
      }
    }

    if (!avatarResponse) {
      // Return a default avatar or placeholder
      console.log('📝 No avatar found, returning 404');
      res.status(404).json({
        status: 'error',
        message: 'No avatar available',
      });
      return;
    }

    // Get the image data and content type
    const imageBuffer = await avatarResponse.arrayBuffer();
    const contentType = avatarResponse.headers.get('content-type') || 'image/png';

    // Set appropriate headers and send the image
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error('Error proxying user avatar:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to load avatar',
    });
  }
});

// Save user progress
router.post<Record<string, never>, SaveProgressResponse, SaveProgressRequest>(
  '/api/user/progress',
  async (req, res): Promise<void> => {
    try {
      const currentUser = await reddit.getCurrentUser();

      if (!currentUser) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated',
        });
        return;
      }

      const username = currentUser.username;
      const { puzzleId, stars, time, score, unlocks } = req.body;

      if (
        !puzzleId ||
        typeof stars !== 'number' ||
        typeof time !== 'number' ||
        typeof score !== 'number'
      ) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid progress data',
        });
        return;
      }

      // Get existing progress
      const progressKey = `user:${username}:progress`;
      const existingData = await redis.get(progressKey);

      let progress: UserProgressData = {
        stars: 0,
        unlocks: ['nature-waterfall'],
        bestTimes: {},
        completedPuzzles: [],
        totalScore: 0,
      };

      if (existingData) {
        progress = JSON.parse(existingData);
      }

      // Update progress
      const wasCompleted = progress.completedPuzzles.includes(puzzleId);

      // Update best time if this is better
      if (!progress.bestTimes[puzzleId] || time < progress.bestTimes[puzzleId]) {
        progress.bestTimes[puzzleId] = time;
      }

      // Add to completed puzzles if not already there
      if (!wasCompleted) {
        progress.completedPuzzles.push(puzzleId);
      }

      // Update stars (only if better than previous)
      const currentPuzzleStars = progress.stars || 0;
      if (stars > currentPuzzleStars) {
        progress.stars += stars - currentPuzzleStars;
      }

      // Update total score
      progress.totalScore += score;

      // Handle unlocks
      if (unlocks && unlocks.length > 0) {
        for (const unlock of unlocks) {
          if (!progress.unlocks.includes(unlock)) {
            progress.unlocks.push(unlock);
          }
        }
      }

      // Save updated progress
      await redis.set(progressKey, JSON.stringify(progress));

      res.json({
        status: 'success',
        message: 'Progress saved successfully',
        updatedProgress: progress,
      });
    } catch (error) {
      console.error('Error saving user progress:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to save progress',
      });
    }
  }
);

// Community puzzle validation function
async function validatePuzzleImage(imageUrl: string): Promise<PuzzleValidationResult> {
  const result: PuzzleValidationResult = {
    isValid: false,
    difficulty: 'easy',
    aspectRatio: 0,
    width: 0,
    height: 0,
    mimeType: '',
    errors: [],
  };

  try {
    // If this is a constructed Reddit URL, try different formats
    let response: Response | null = null;
    let workingUrl = imageUrl;

    if (imageUrl.includes('i.redd.it') && imageUrl.endsWith('.png')) {
      const baseUrl = imageUrl.replace('.png', '');
      const formats = ['.png', '.jpg', '.jpeg'];

      for (const format of formats) {
        const testUrl = baseUrl + format;
        console.log(`🔍 Trying image format: ${testUrl}`);

        try {
          const testResponse = await fetch(testUrl);
          if (testResponse.ok) {
            response = testResponse;
            workingUrl = testUrl;
            console.log(`✅ Found working image URL: ${workingUrl}`);
            break;
          }
        } catch (error) {
          console.log(`❌ Format ${format} failed:`, error);
        }
      }

      if (!response) {
        result.errors.push('Failed to fetch image from any format (.png, .jpg, .jpeg)');
        return result;
      }
    } else {
      // Fetch the image to validate
      response = await fetch(imageUrl);
      if (!response.ok) {
        result.errors.push('Failed to fetch image from URL');
        return result;
      }
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      result.errors.push('Invalid content type - must be an image');
      return result;
    }

    result.mimeType = contentType;

    // Check if it's a supported image format
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(contentType)) {
      result.errors.push('Unsupported image format - must be JPEG, PNG, or WebP');
      return result;
    }

    // Get image buffer to check dimensions
    const buffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Basic image dimension detection (simplified)
    let width = 0;
    let height = 0;

    if (contentType === 'image/png') {
      // PNG header check
      if (uint8Array.length >= 24) {
        width =
          (uint8Array[16]! << 24) |
          (uint8Array[17]! << 16) |
          (uint8Array[18]! << 8) |
          uint8Array[19]!;
        height =
          (uint8Array[20]! << 24) |
          (uint8Array[21]! << 16) |
          (uint8Array[22]! << 8) |
          uint8Array[23]!;
      }
    } else if (contentType === 'image/jpeg') {
      // JPEG dimension detection (simplified - would need more robust parsing in production)
      // For now, assume reasonable dimensions
      width = 800;
      height = 600;
    }

    if (width === 0 || height === 0) {
      result.errors.push('Could not determine image dimensions');
      return result;
    }

    result.width = width;
    result.height = height;
    result.aspectRatio = width / height;

    // Validate aspect ratio (reject extreme ratios)
    if (result.aspectRatio < 0.5 || result.aspectRatio > 2.0) {
      result.errors.push('Invalid aspect ratio - must be between 0.5 and 2.0');
      return result;
    }

    // Validate minimum dimensions
    if (width < 200 || height < 200) {
      result.errors.push('Image too small - minimum 200x200 pixels');
      return result;
    }

    // Validate maximum dimensions
    if (width > 2048 || height > 2048) {
      result.errors.push('Image too large - maximum 2048x2048 pixels');
      return result;
    }

    // Determine difficulty based on image size (minimum medium for community puzzles to ensure 4x4 grid)
    const totalPixels = width * height;
    if (totalPixels < 150000) {
      result.difficulty = 'easy';
    } else if (totalPixels < 600000) {
      result.difficulty = 'medium'; // Default for most community submissions
    } else if (totalPixels < 1200000) {
      result.difficulty = 'hard';
    } else {
      result.difficulty = 'expert';
    }

    result.isValid = true;
    return result;
  } catch (error) {
    result.errors.push(
      `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return result;
  }
}

// Helper function to check if a post is the main app post (official app post)
async function checkIfMainAppPost(postId: string): Promise<boolean> {
  try {
    // Get the list of official app post IDs
    const appPostsKey = 'official:app:posts';
    const appPostsData = await redis.get(appPostsKey);
    const officialPostIds = appPostsData ? JSON.parse(appPostsData) : [];

    // Clean the post ID (remove t3_ prefix if present)
    const cleanPostId = postId.replace('t3_', '');

    // Check if this post ID is in our official app posts list
    const isMainAppPost = officialPostIds.includes(cleanPostId);

    if (isMainAppPost) {
      console.log('🏠 Post is an official app post:', cleanPostId);
    } else {
      console.log('🧩 Post is a community puzzle post:', cleanPostId);
    }

    return isMainAppPost;
  } catch (error) {
    console.error('Error checking post type:', error);
    // Default to treating as community puzzle post for safety (allow social interaction)
    return false;
  }
}

// Helper function to submit comments with retry logic for rate limits
async function submitCommentWithRetry(
  commentId: string,
  text: string,
  maxRetries: number = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await reddit.submitComment({
        id: commentId as `t1_${string}`,
        text: text,
      });
      console.log(`✅ Comment submitted successfully on attempt ${attempt}`);
      return;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ Comment submission attempt ${attempt} failed:`, errorMessage);

      // Check if it's a rate limit error
      if (errorMessage && errorMessage.includes('RATELIMIT')) {
        const waitTime = Math.min(5000 * attempt, 15000); // Wait 5s, 10s, 15s max
        console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // If it's not a rate limit error or we've exhausted retries, throw the error
      if (attempt === maxRetries) {
        console.error(`❌ Failed to submit comment after ${maxRetries} attempts`);
        throw error;
      }
    }
  }
}

// Process community puzzle submission
async function processCommunityPuzzle(
  commentId: string,
  imageUrl: string,
  submittedBy: string
): Promise<void> {
  try {
    console.log(`🎨 Processing community puzzle submission from ${submittedBy}`);
    console.log(`📸 Image URL: ${imageUrl}`);
    console.log(`💬 Comment ID: ${commentId}`);

    const puzzleId = `community-${commentId}`;

    // Check if this puzzle has already been processed
    const existingSubmissionKey = `community:puzzle:${puzzleId}`;
    const existingSubmission = await redis.get(existingSubmissionKey);

    if (existingSubmission) {
      console.log('⚠️ Puzzle already processed for this comment, skipping:', puzzleId);
      return;
    }

    // Check if this image URL has already been processed (prevent duplicate images)
    // Use the full URL as the hash key to avoid collisions
    const imageHash = `community:image:${Buffer.from(imageUrl).toString('base64')}`;
    const existingImageSubmission = await redis.get(imageHash);

    console.log('🔍 Checking for duplicate image...');
    console.log('📸 Image URL:', imageUrl);
    console.log('🔑 Image hash key:', imageHash.slice(0, 50) + '...');

    if (existingImageSubmission) {
      console.log('⚠️ This image has already been processed, skipping duplicate');
      console.log('🔍 Existing submission:', existingImageSubmission);

      try {
        const existingData = JSON.parse(existingImageSubmission);

        // Reply to let user know this image was already submitted
        await submitCommentWithRetry(
          commentId,
          `⚠️ This image has already been submitted as a community puzzle by u/${existingData.submittedBy}. Please try a different image!`
        );
      } catch (parseError) {
        console.error('Error parsing existing submission data:', parseError);
        // Reply with generic message if parsing fails
        await submitCommentWithRetry(
          commentId,
          `⚠️ This image has already been submitted as a community puzzle. Please try a different image!`
        );
      }
      return;
    } else {
      console.log('✅ Image is unique, proceeding with processing');
    }

    // Validate the image
    console.log('🔍 Starting image validation...');
    const validation = await validatePuzzleImage(imageUrl);
    console.log('✅ Image validation complete:', validation);

    const submission: CommunityPuzzleSubmission = {
      id: puzzleId,
      title: `Community Puzzle by u/${submittedBy}`,
      submittedBy,
      imageUrl,
      commentId,
      status: validation.isValid ? 'approved' : 'rejected',
      rejectionReason: validation.isValid ? undefined : validation.errors.join(', '),
      submittedAt: Date.now(),
      processedAt: Date.now(),
      difficulty: validation.difficulty,
      aspectRatio: validation.aspectRatio,
      imageWidth: validation.width,
      imageHeight: validation.height,
      mimeType: validation.mimeType,
    };

    // Store submission in Redis
    const submissionKey = `community:puzzle:${puzzleId}`;
    await redis.set(submissionKey, JSON.stringify(submission));

    // Store image hash to prevent duplicates (reuse the same hash key)
    await redis.set(
      imageHash,
      JSON.stringify({
        puzzleId: submission.id,
        submittedBy,
        submittedAt: Date.now(),
        imageUrl,
      })
    );

    // Add to submissions list
    const submissionsListKey = 'community:puzzles:list';
    const currentList = await redis.get(submissionsListKey);
    const puzzleIds = currentList ? JSON.parse(currentList) : [];
    if (!puzzleIds.includes(puzzleId)) {
      puzzleIds.push(puzzleId);
      await redis.set(submissionsListKey, JSON.stringify(puzzleIds));
    }

    // Reply to the comment with status
    if (validation.isValid) {
      // Create the post first
      const post = await createCommunityPuzzlePost(submission);

      if (post) {
        // Update submission with post ID
        submission.postId = post.id;
        console.log('✅ Created post with ID:', post.id);
        console.log('💾 Storing puzzle with postId:', submission.postId);

        const submissionKey = `community:puzzle:${submission.id}`;
        await redis.set(submissionKey, JSON.stringify(submission));

        console.log('📝 Puzzle stored with key:', submissionKey);

        // Check for community creator achievement
        const newAchievements = await checkAchievements(submittedBy, {
          type: 'community_approved',
        });

        if (newAchievements.length > 0) {
          console.log(`🏅 User ${submittedBy} unlocked ${newAchievements.length} achievements!`);
        }

        // Reply with approval and direct link to the puzzle
        const postUrl = `https://reddit.com/r/${context.subredditName}/comments/${post.id}`;
        await submitCommentWithRetry(
          commentId,
          `🎉 **Puzzle Approved!** Your submission has been turned into a playable puzzle!\n\n� **Detailse:**\n• Difficulty: ${validation.difficulty}\n• Dimensions: ${validation.width}x${validation.height}\n\n� **[▶️ PLA️Y YOUR PUZZLE NOW!](${postUrl})**\n\nShare the link with friends and see who can solve it fastest! 🏆`
        );
      } else {
        // Fallback if post creation failed
        await submitCommentWithRetry(
          commentId,
          `🎉 Your puzzle submission has been approved! \n\nDifficulty: ${validation.difficulty}\nDimensions: ${validation.width}x${validation.height}\n\n⚠️ There was an issue creating the puzzle post. Please try again.`
        );
      }
    } else {
      await submitCommentWithRetry(
        commentId,
        `❌ Your puzzle submission was rejected.\n\nReason: ${validation.errors.join(', ')}\n\nPlease ensure your image:\n- Is between 200x200 and 2048x2048 pixels\n- Has an aspect ratio between 0.5 and 2.0\n- Is in JPEG, PNG, or WebP format`
      );
    }
  } catch (error) {
    console.error('Error processing community puzzle:', error);

    // Reply with error message
    try {
      await submitCommentWithRetry(
        commentId,
        `⚠️ There was an error processing your puzzle submission. Please try again later.`
      );
    } catch (replyError) {
      console.error('Error replying to comment:', replyError);
    }
  }
}

// Create a new post for approved community puzzle
async function createCommunityPuzzlePost(
  submission: CommunityPuzzleSubmission
): Promise<{ id: string } | null> {
  try {
    const post = await reddit.submitCustomPost({
      subredditName: context.subredditName!,
      title: `${submission.title} - [Difficulty: ${submission.difficulty}]`,
      splash: {
        appDisplayName: `Community Puzzle by u/${submission.submittedBy}`,
        backgroundUri: submission.imageUrl,
        buttonLabel: 'Solve Puzzle',
        description: '',
        heading: '',
        appIconUri: 'icon75.png',
      },
    });

    // Create initial leaderboard for this puzzle
    const leaderboardKey = `puzzle:leaderboard:${submission.id}:${post.id}`;
    await redis.set(
      `${leaderboardKey}:info`,
      JSON.stringify({
        puzzleId: submission.id,
        postId: post.id,
        createdAt: Date.now(),
        createdBy: submission.submittedBy,
      })
    );

    console.log(`✅ Created community puzzle post: ${post.id} for puzzle ${submission.id}`);
    return post;
  } catch (error) {
    console.error('Error creating community puzzle post:', error);
    return null;
  }
}

// Get community puzzle by post ID
router.get<{ postId: string }, CommunityPuzzleResponse>(
  '/api/community-puzzle/:postId',
  async (req, res): Promise<void> => {
    try {
      const { postId } = req.params;

      if (!postId) {
        res.status(400).json({
          status: 'error',
          message: 'Post ID is required',
        });
        return;
      }

      console.log('🔍 Looking for community puzzle with post ID:', postId);
      console.log('📏 Post ID length:', postId.length);
      console.log('🔤 Post ID type:', typeof postId);

      // Normalize post ID - Reddit post IDs can be with or without t3_ prefix
      const normalizedPostId = postId.startsWith('t3_') ? postId : `t3_${postId}`;
      const alternatePostId = postId.startsWith('t3_') ? postId.substring(3) : postId;

      console.log('🔄 Normalized post ID:', normalizedPostId);
      console.log('🔄 Alternate post ID:', alternatePostId);

      // Find puzzle by post ID
      const submissionsListKey = 'community:puzzles:list';
      const submissionsData = await redis.get(submissionsListKey);
      const puzzleIds = submissionsData ? JSON.parse(submissionsData) : [];

      console.log('📋 Found puzzle IDs in list:', puzzleIds);
      console.log('📊 Total puzzles to check:', puzzleIds.length);

      // First, collect all post IDs for comparison
      const allPostIds: string[] = [];
      const puzzleDetails: Array<{ puzzleId: string; postId: string; title: string }> = [];

      for (const puzzleId of puzzleIds) {
        const submissionKey = `community:puzzle:${puzzleId}`;
        const submissionData = await redis.get(submissionKey);
        if (submissionData) {
          const puzzle = JSON.parse(submissionData);
          allPostIds.push(puzzle.postId || 'NO_POST_ID');
          puzzleDetails.push({
            puzzleId: puzzle.id,
            postId: puzzle.postId || 'NO_POST_ID',
            title: puzzle.title || 'NO_TITLE',
          });
        }
      }

      console.log('🎯 COMPARISON ANALYSIS:');
      console.log('   Searching for:', postId);
      console.log('   Available post IDs:', allPostIds);
      console.log('   Puzzle details:', puzzleDetails);

      let foundPuzzle: CommunityPuzzleSubmission | null = null;

      for (const puzzleId of puzzleIds) {
        const submissionKey = `community:puzzle:${puzzleId}`;
        const submissionData = await redis.get(submissionKey);
        if (submissionData) {
          const puzzle = JSON.parse(submissionData);

          console.log(`🧩 Checking puzzle ${puzzleId}:`);
          console.log(
            `   - Puzzle postId: "${puzzle.postId}" (length: ${puzzle.postId?.length || 0})`
          );
          console.log(`   - Search postId: "${postId}" (length: ${postId.length})`);
          console.log(`   - Exact match: ${puzzle.postId === postId}`);
          console.log(`   - Normalized match: ${puzzle.postId === normalizedPostId}`);
          console.log(`   - Alternate match: ${puzzle.postId === alternatePostId}`);

          // Check for exact match or normalized match
          if (
            puzzle.postId === postId ||
            puzzle.postId === normalizedPostId ||
            puzzle.postId === alternatePostId
          ) {
            console.log('✅ MATCH FOUND! Using this puzzle.');
            foundPuzzle = puzzle;
            break;
          } else {
            console.log('❌ No match for this puzzle.');
          }
        } else {
          console.log(`⚠️ No data found for puzzle ${puzzleId}`);
        }
      }

      if (!foundPuzzle) {
        console.log('❌ NO PUZZLE FOUND AFTER CHECKING ALL OPTIONS');
        console.log('🔍 FINAL SUMMARY:');
        console.log('   - Searched for post ID:', postId);
        console.log('   - Also tried:', normalizedPostId, alternatePostId);
        console.log('   - Total puzzles checked:', puzzleIds.length);
        console.log('   - Available post IDs:', allPostIds);
        console.log('   - Puzzle details:', puzzleDetails);

        res.status(404).json({
          status: 'error',
          message: `Community puzzle not found for post ${postId}. Found ${puzzleIds.length} total puzzles.`,
        });
        return;
      }

      res.json({
        status: 'success',
        message: 'Community puzzle found',
        puzzle: foundPuzzle,
      });
    } catch (error) {
      console.error('Error fetching community puzzle:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch community puzzle',
      });
    }
  }
);

// Get community puzzles
router.get<Record<string, never>, CommunityPuzzleListResponse>(
  '/api/community-puzzles',
  async (_req, res): Promise<void> => {
    try {
      const puzzles: CommunityPuzzleSubmission[] = [];

      // Get list of community puzzle IDs
      const submissionsListKey = 'community:puzzles:list';
      const submissionsData = await redis.get(submissionsListKey);
      const puzzleIds = submissionsData ? JSON.parse(submissionsData) : [];

      for (const puzzleId of puzzleIds) {
        const submissionKey = `community:puzzle:${puzzleId}`;
        const submissionData = await redis.get(submissionKey);
        if (submissionData) {
          puzzles.push(JSON.parse(submissionData));
        }
      }

      // Sort by submission date (newest first)
      puzzles.sort((a, b) => b.submittedAt - a.submittedAt);

      res.json({
        status: 'success',
        puzzles,
      });
    } catch (error) {
      console.error('Error fetching community puzzles:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch community puzzles',
      });
    }
  }
);

// Share solve stats as a comment on community puzzle post
router.post('/api/share-solve', async (req, res): Promise<void> => {
  try {
    const { puzzleId, time, moves, score, perfect, postId } = req.body;

    if (!puzzleId || time === undefined || moves === undefined || !postId) {
      res.status(400).json({
        status: 'error',
        message: 'Missing required fields: puzzleId, time, moves, postId',
      });
      return;
    }

    // Validate postId format
    const cleanPostId = postId.replace('t3_', '');
    if (!cleanPostId || cleanPostId.length < 5) {
      console.error('❌ Invalid postId format:', postId);
      res.status(400).json({
        status: 'error',
        message: 'Invalid post ID format',
      });
      return;
    }

    console.log('🔍 Share solve request:', { puzzleId, time, moves, postId, cleanPostId });

    // Get puzzle details
    const puzzleKey = `community:puzzle:${puzzleId}`;
    const puzzleData = await redis.get(puzzleKey);

    if (!puzzleData) {
      res.status(404).json({
        status: 'error',
        message: 'Puzzle not found',
      });
      return;
    }

    const puzzle = JSON.parse(puzzleData);

    // Format time nicely
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

    // Create share comment
    const perfectText = perfect ? ' 🏆 Perfect!' : '';
    const shareComment = `🧩 **Puzzle Solved!** 🎉${perfectText}

📊 **My Stats:**
⏱️ Time: ${timeStr}
🔄 Moves: ${moves}
🎯 Score: ${score || 0}
🧩 Puzzle: "${puzzle.title}"

Great puzzle! 👏`;

    // Post the comment directly on the post (not replying to a comment)
    const formattedPostId = postId.startsWith('t3_')
      ? (postId as `t3_${string}`)
      : (`t3_${postId}` as `t3_${string}`);

    console.log('📤 Attempting to post share comment on post:', formattedPostId);
    console.log('📝 Comment text:', shareComment);

    // Get current user context for debugging
    const currentUser = await reddit.getCurrentUser();
    console.log('👤 Current user context:', currentUser?.username || 'No user');

    await reddit.submitComment({
      id: formattedPostId,
      text: shareComment,
      runAs: "USER",
    });

    console.log('✅ Shared solve stats successfully:', { puzzleId, time, moves, postId });

    res.json({
      status: 'success',
      message: 'Solve stats shared successfully!',
    });
  } catch (error) {
    console.error('Error sharing solve stats:', error);

    // Check for specific Reddit API errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    let userMessage = 'Failed to share solve stats';

    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      userMessage = 'Permission denied - unable to post comment';
      console.error('❌ Reddit API permission error - check app permissions');
    } else if (errorMessage.includes('RATELIMIT')) {
      userMessage = 'Rate limited - please try again in a moment';
    } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      userMessage = 'Post not found - it may have been deleted';
    }

    res.status(500).json({
      status: 'error',
      message: userMessage,
    });
  }
});

// Save community puzzle completion
router.post<
  Record<string, never>,
  PuzzleCompletionResponse,
  PuzzleCompletionData & { puzzleId?: string; postId?: string }
>('/api/community-puzzle-complete', async (req, res): Promise<void> => {
  try {
    const currentUser = await reddit.getCurrentUser();

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    const { time, score, moves, stars, puzzleId, postId } = req.body;
    const username = currentUser.username;

    if (!puzzleId || !postId || typeof time !== 'number' || typeof score !== 'number') {
      res.status(400).json({
        status: 'error',
        message: 'Invalid completion data',
      });
      return;
    }

    // Store completion data
    const completionData = {
      time,
      score,
      moves,
      stars,
      username,
      timestamp: Date.now(),
      postId,
      puzzleId,
    };

    // Store individual completion
    const completionKey = `community:completion:${puzzleId}:${postId}:${username}:${Date.now()}`;
    await redis.set(completionKey, JSON.stringify(completionData));

    // Update leaderboard for this community puzzle
    const leaderboardKey = `puzzle:leaderboard:${puzzleId}:${postId}`;
    await redis.zAdd(leaderboardKey, {
      score: time,
      member: JSON.stringify(completionData),
    });

    // Keep only top 10 scores
    await redis.zRemRangeByRank(leaderboardKey, 10, -1);

    // Create a comment on the post with the completion
    const completionComment =
      `🎉 **Puzzle Solved!**\n\n` +
      `**Player:** u/${username}\n` +
      `**Time:** ${time.toFixed(1)}s\n` +
      `**Score:** ${score}\n` +
      `**Stars:** ${'⭐'.repeat(stars)}\n` +
      `**Moves:** ${moves}\n\n` +
      `Great job solving this community puzzle!`;

    await reddit.submitComment({
      id: postId as `t3_${string}`,
      text: completionComment,
    });

    res.json({
      status: 'success',
      message: 'Community puzzle completion recorded and posted!',
    });
  } catch (error) {
    console.error('Error saving community puzzle completion:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save completion data',
    });
  }
});

// Comment creation trigger (DISABLED in devvit.json to prevent duplicate processing)
router.post('/internal/on-comment-create', async (req, res): Promise<void> => {
  try {
    console.log('🔔 Comment creation webhook triggered');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

    const { comment } = req.body;

    if (!comment) {
      console.log('⚠️ No comment data received');
      res.json({ status: 'no_comment' });
      return;
    }

    // Ignore comments from the bot itself to prevent recursive processing
    const authorName = req.body.author?.name;
    if (authorName === 'solved-online' || authorName?.includes('solved-online')) {
      console.log('🤖 Ignoring comment from bot itself:', authorName);
      res.json({ status: 'ignored_bot_comment' });
      return;
    }

    console.log('💬 Comment received:', {
      id: comment.id,
      author: authorName,
      hasMediaUrls: !!comment.mediaUrls,
      mediaUrlCount: comment.mediaUrls?.length || 0,
      elementTypes: comment.elementTypes,
    });

    // Check if comment has image URLs or image elements
    let imageUrl: string | null = null;

    if (comment.mediaUrls && comment.mediaUrls.length > 0) {
      console.log('🖼️ Media URLs found:', comment.mediaUrls);
      imageUrl = comment.mediaUrls[0];
    } else if (comment.elementTypes && comment.elementTypes.includes('img')) {
      console.log('🖼️ Image element detected, extracting from comment body');
      // Extract image ID from comment body like "![img](ykvqpxhsexwf1)"
      const imageMatch = comment.body.match(/!\[img\]\(([^)]+)\)/);
      if (imageMatch && imageMatch[1]) {
        const imageId = imageMatch[1];
        // Construct Reddit image URL
        imageUrl = `https://i.redd.it/${imageId}.png`;
        console.log('🔗 Constructed image URL:', imageUrl);
      }
    }

    if (imageUrl) {
      console.log('✅ Image URL found:', imageUrl);
      const submittedBy = req.body.author?.name || 'unknown';

      // Process the puzzle submission (will reply with final result)
      await processCommunityPuzzle(comment.id, imageUrl, submittedBy);
    } else {
      console.log('📝 Comment has no processable images');
    }

    res.json({ status: 'processed' });
  } catch (error) {
    console.error('Error handling comment creation:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process comment' });
  }
});

// Comment submit trigger (alternative trigger)
router.post('/internal/on-comment-submit', async (req, res): Promise<void> => {
  try {
    console.log('🔔 Comment submit webhook triggered');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

    const { comment } = req.body;

    if (!comment) {
      console.log('⚠️ No comment data received');
      res.json({ status: 'no_comment' });
      return;
    }

    // Ignore comments from the bot itself to prevent recursive processing
    const authorName = req.body.author?.name;
    if (authorName === 'solved-online' || authorName?.includes('solved-online')) {
      console.log('🤖 Ignoring comment from bot itself:', authorName);
      res.json({ status: 'ignored_bot_comment' });
      return;
    }

    console.log('💬 Comment received:', {
      id: comment.id,
      author: authorName,
      hasMediaUrls: !!comment.mediaUrls,
      mediaUrlCount: comment.mediaUrls?.length || 0,
      elementTypes: comment.elementTypes,
      postId: comment.postId,
    });

    // Check if this is a comment on the main app post or a community puzzle post
    const postId = comment.postId;
    const isMainAppPost = await checkIfMainAppPost(postId);
    const hasImage =
      comment.elementTypes?.includes('img') || (comment.mediaUrls && comment.mediaUrls.length > 0);

    console.log('🏠 Post type analysis:', {
      postId,
      isMainAppPost,
      hasImage,
      elementTypes: comment.elementTypes,
    });

    // Handle comments based on post type
    if (isMainAppPost) {
      // This is the main app post - only allow image submissions
      if (!hasImage) {
        console.log('🗑️ Deleting non-image comment on main app post');

        try {
          // Reply with helpful message before deleting
          await submitCommentWithRetry(
            comment.id,
            `📸 **Image Required!** This post is for puzzle submissions only. Please upload an image to create a community puzzle.\\n\\n💬 For discussions and social interaction, please comment on the individual puzzle posts instead!`
          );

          // Wait a moment for the reply to be posted, then delete the original comment
          setTimeout(async () => {
            try {
              await reddit.remove(comment.id as `t1_${string}`, false);
              console.log('✅ Successfully deleted non-image comment after reply');
            } catch (deleteError) {
              console.error('❌ Failed to delete comment:', deleteError);
            }
          }, 2000); // Wait 2 seconds
        } catch (replyError) {
          console.error('❌ Failed to reply to non-image comment:', replyError);

          // Still try to delete even if reply failed
          try {
            await reddit.remove(comment.id as `t1_${string}`, false);
            console.log('✅ Successfully deleted non-image comment (no reply)');
          } catch (deleteError) {
            console.error('❌ Failed to delete comment:', deleteError);
          }
        }

        res.json({ status: 'deleted_non_image_comment' });
        return;
      }

      console.log('📸 Processing image submission on main app post');
    } else {
      // This is a community puzzle post - allow all comments (social interaction)
      console.log('💬 Allowing social comment on community puzzle post');
      res.json({ status: 'social_comment_allowed' });
      return;
    }

    // Check if comment has image URLs or image elements
    let imageUrl: string | null = null;

    if (comment.mediaUrls && comment.mediaUrls.length > 0) {
      console.log('🖼️ Media URLs found:', comment.mediaUrls);
      imageUrl = comment.mediaUrls[0];
    } else if (comment.elementTypes && comment.elementTypes.includes('img')) {
      console.log('🖼️ Image element detected, extracting from comment body');
      // Extract image ID from comment body like "![img](ykvqpxhsexwf1)"
      const imageMatch = comment.body.match(/!\[img\]\(([^)]+)\)/);
      if (imageMatch && imageMatch[1]) {
        const imageId = imageMatch[1];
        // Construct Reddit image URL
        imageUrl = `https://i.redd.it/${imageId}.png`;
        console.log('🔗 Constructed image URL:', imageUrl);
      }
    }

    if (imageUrl) {
      console.log('✅ Image URL found:', imageUrl);
      const submittedBy = req.body.author?.name || 'unknown';

      // Process the puzzle submission
      await processCommunityPuzzle(comment.id, imageUrl, submittedBy);
    } else {
      console.log('📝 Comment has no processable images');
    }

    res.json({ status: 'processed' });
  } catch (error) {
    console.error('Error handling comment submit:', error);
    res.status(500).json({ status: 'error', message: 'Failed to process comment' });
  }
});

// Clear all uploaded puzzle images
router.delete('/api/clear-puzzle-images', async (_req, res): Promise<void> => {
  try {
    // Get list of uploaded puzzle IDs
    const imageListKey = 'puzzle:media:list';
    const imageListData = await redis.get(imageListKey);
    const imageIds = imageListData ? JSON.parse(imageListData) : [];

    let deletedCount = 0;

    // Delete each puzzle image data
    for (const puzzleId of imageIds) {
      const mediaKey = `puzzle:media:${puzzleId}`;
      try {
        await redis.del(mediaKey);
        deletedCount++;
      } catch (error) {
        console.warn(`Failed to delete ${mediaKey}:`, error);
      }
    }

    // Clear the list
    await redis.del(imageListKey);

    res.json({
      status: 'success',
      message: `Cleared ${deletedCount} puzzle images from CDN`,
      deletedCount,
    });
  } catch (error) {
    console.error('Error clearing puzzle images:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear puzzle images',
    });
  }
});

// Clear all uploaded music tracks
router.delete('/api/clear-music-tracks', async (_req, res): Promise<void> => {
  try {
    // Get list of uploaded track IDs
    const trackListKey = 'music:media:list';
    const trackListData = await redis.get(trackListKey);
    const trackIds = trackListData ? JSON.parse(trackListData) : [];

    let deletedCount = 0;

    // Delete each music track data
    for (const trackId of trackIds) {
      const mediaKey = `music:media:${trackId}`;
      try {
        await redis.del(mediaKey);
        deletedCount++;
      } catch (error) {
        console.warn(`Failed to delete ${mediaKey}:`, error);
      }
    }

    // Clear the list
    await redis.del(trackListKey);

    res.json({
      status: 'success',
      message: `Cleared ${deletedCount} music tracks from CDN`,
      deletedCount,
    });
  } catch (error) {
    console.error('Error clearing music tracks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear music tracks',
    });
  }
});

// Debug endpoint to list all community puzzles with their post IDs
router.get('/api/debug-community-puzzles', async (_req, res): Promise<void> => {
  try {
    const submissionsListKey = 'community:puzzles:list';
    const submissionsData = await redis.get(submissionsListKey);
    const puzzleIds = submissionsData ? JSON.parse(submissionsData) : [];

    const puzzles = [];
    for (const puzzleId of puzzleIds) {
      const submissionKey = `community:puzzle:${puzzleId}`;
      const submissionData = await redis.get(submissionKey);
      if (submissionData) {
        const puzzle = JSON.parse(submissionData);
        puzzles.push({
          puzzleId: puzzle.id,
          postId: puzzle.postId,
          title: puzzle.title,
          submittedBy: puzzle.submittedBy,
          status: puzzle.status,
        });
      }
    }

    res.json({
      status: 'success',
      totalPuzzles: puzzles.length,
      puzzles,
    });
  } catch (error) {
    console.error('Error debugging community puzzles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to debug community puzzles',
    });
  }
});

// Debug endpoint to check image hashes in Redis
router.get('/api/debug-image-hashes', async (_req, res): Promise<void> => {
  try {
    // This is a simplified approach - in a real Redis setup you'd use SCAN
    // For now, we'll just return a message about the debugging
    res.json({
      status: 'info',
      message: 'Image hash debugging enabled. Check server logs for hash information.',
      note: 'Each image URL gets a unique hash. If you see duplicate errors, check the logs for hash collisions.',
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to debug image hashes',
    });
  }
});

// Clear all image hashes (for debugging duplicate issues)
router.delete('/api/clear-image-hashes', async (_req, res): Promise<void> => {
  try {
    // Note: This is a simplified approach. In production, you'd want to use Redis SCAN
    // to find and delete keys matching the pattern 'community:image:*'

    res.json({
      status: 'success',
      message:
        'Image hash clearing endpoint available. Individual hashes are cleared when puzzles are processed.',
      note: 'If you need to clear all image hashes, you would need to implement Redis SCAN pattern matching.',
    });
  } catch (error) {
    console.error('Error clearing image hashes:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear image hashes',
    });
  }
});

// Test endpoint to manually process a community puzzle
router.post('/api/test-community-puzzle', async (req, res): Promise<void> => {
  try {
    const { imageUrl, commentId, submittedBy } = req.body;

    if (!imageUrl || !commentId || !submittedBy) {
      res.status(400).json({
        status: 'error',
        message: 'imageUrl, commentId, and submittedBy are required',
      });
      return;
    }

    console.log('🧪 Testing community puzzle processing:', { imageUrl, commentId, submittedBy });

    // Process the puzzle submission
    await processCommunityPuzzle(commentId, imageUrl, submittedBy);

    res.json({
      status: 'success',
      message: 'Community puzzle processing initiated',
    });
  } catch (error) {
    console.error('Error in test community puzzle:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process test community puzzle',
    });
  }
});

// Clear all media (both images and music)
router.delete('/api/clear-all-media', async (_req, res): Promise<void> => {
  try {
    // Clear puzzle images
    const imageListKey = 'puzzle:media:list';
    const imageListData = await redis.get(imageListKey);
    const imageIds = imageListData ? JSON.parse(imageListData) : [];

    let deletedImages = 0;
    for (const puzzleId of imageIds) {
      const mediaKey = `puzzle:media:${puzzleId}`;
      try {
        await redis.del(mediaKey);
        deletedImages++;
      } catch (error) {
        console.warn(`Failed to delete ${mediaKey}:`, error);
      }
    }
    await redis.del(imageListKey);

    // Clear music tracks
    const trackListKey = 'music:media:list';
    const trackListData = await redis.get(trackListKey);
    const trackIds = trackListData ? JSON.parse(trackListData) : [];

    let deletedTracks = 0;
    for (const trackId of trackIds) {
      const mediaKey = `music:media:${trackId}`;
      try {
        await redis.del(mediaKey);
        deletedTracks++;
      } catch (error) {
        console.warn(`Failed to delete ${mediaKey}:`, error);
      }
    }
    await redis.del(trackListKey);

    res.json({
      status: 'success',
      message: `Cleared all media: ${deletedImages} images, ${deletedTracks} tracks`,
      deletedImages,
      deletedTracks,
    });
  } catch (error) {
    console.error('Error clearing all media:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear all media',
    });
  }
});

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await reddit.submitCustomPost({
      subredditName: context.subredditName!,
      title: 'Solved!',
      splash: {
        appDisplayName: 'Solved! - A classic jigsaw puzzle adventure',
        backgroundUri: 'splash.png',
        buttonLabel: 'Play Now',
        description: '',
        heading: 'Can you solve them all?',
        appIconUri: 'icon75.png',
      },
    });

    // Save this as an official app post ID
    const appPostsKey = 'official:app:posts';
    try {
      const existingPosts = await redis.get(appPostsKey);
      const postIds = existingPosts ? JSON.parse(existingPosts) : [];

      // Add this post ID if not already present
      const cleanPostId = post.id.replace('t3_', '');
      if (!postIds.includes(cleanPostId)) {
        postIds.push(cleanPostId);
        await redis.set(appPostsKey, JSON.stringify(postIds));
        console.log('🏠 Saved official app post ID:', cleanPostId);
      }
    } catch (redisError) {
      console.error('❌ Failed to save app post ID:', redisError);
    }

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await reddit.submitCustomPost({
      subredditName: context.subredditName!,
      title: 'Solved! - A classic jigsaw puzzle adventure',
      splash: {
        appDisplayName: 'Solved! - A classic jigsaw puzzle adventure',
        backgroundUri: 'splash.png',
        buttonLabel: 'Play Now',
        description: '',
        heading: 'Can you solve them all?',
        appIconUri: 'icon75.png',
      },
    });

    // Save this as an official app post ID
    const appPostsKey = 'official:app:posts';
    try {
      const existingPosts = await redis.get(appPostsKey);
      const postIds = existingPosts ? JSON.parse(existingPosts) : [];

      // Add this post ID if not already present
      const cleanPostId = post.id.replace('t3_', '');
      if (!postIds.includes(cleanPostId)) {
        postIds.push(cleanPostId);
        await redis.set(appPostsKey, JSON.stringify(postIds));
        console.log('🏠 Saved official app post ID:', cleanPostId);
      }
    } catch (redisError) {
      console.error('❌ Failed to save app post ID:', redisError);
    }

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Achievement system functions
const ACHIEVEMENTS_CONFIG: Achievement[] = [
  {
    id: 'first_puzzle',
    title: '🧩 Novice Solver',
    description: 'Complete your first puzzle',
    icon: '🧩',
    isUnlocked: false,
    category: 'puzzle',
    condition: { type: 'first_puzzle' },
  },
  {
    id: 'speed_demon',
    title: '⚡ Quick Thinker',
    description: 'Solve a puzzle in under 2 minutes',
    icon: '⚡',
    isUnlocked: false,
    category: 'speed',
    condition: { type: 'speed_solve', value: 120 },
  },
  {
    id: 'perfect_solver',
    title: '⭐ Perfect Solver',
    description: 'Complete a puzzle with full stars (no mistakes)',
    icon: '⭐',
    isUnlocked: false,
    category: 'mastery',
    condition: { type: 'perfect_solve' },
  },
  {
    id: 'easy_master',
    title: '🌱 Easy Master',
    description: 'Complete all easy difficulty puzzles',
    icon: '🌱',
    isUnlocked: false,
    category: 'mastery',
    condition: { type: 'difficulty_complete', value: 'easy' },
  },
  {
    id: 'medium_master',
    title: '🔥 Medium Master',
    description: 'Complete all medium difficulty puzzles',
    icon: '🔥',
    isUnlocked: false,
    category: 'mastery',
    condition: { type: 'difficulty_complete', value: 'medium' },
  },
  {
    id: 'hard_master',
    title: '💎 Hard Master',
    description: 'Complete all hard difficulty puzzles',
    icon: '💎',
    isUnlocked: false,
    category: 'mastery',
    condition: { type: 'difficulty_complete', value: 'hard' },
  },
  {
    id: 'expert_master',
    title: '👑 Puzzle Master',
    description: 'Complete all expert difficulty puzzles',
    icon: '👑',
    isUnlocked: false,
    category: 'mastery',
    condition: { type: 'difficulty_complete', value: 'expert' },
  },
  {
    id: 'community_creator',
    title: '🧠 Community Creator',
    description: 'Submit a community puzzle that gets approved',
    icon: '🧠',
    isUnlocked: false,
    category: 'community',
    condition: { type: 'community_approved' },
  },
  {
    id: 'puzzle_enthusiast',
    title: '🎯 Puzzle Enthusiast',
    description: 'Complete 10 puzzles',
    icon: '🎯',
    isUnlocked: false,
    category: 'puzzle',
    condition: { type: 'total_puzzles', value: 10 },
  },
  {
    id: 'star_collector',
    title: '🌟 Star Collector',
    description: 'Earn 50 total stars',
    icon: '🌟',
    isUnlocked: false,
    category: 'mastery',
    condition: { type: 'total_stars', value: 50 },
  },
];

// Flair mapping for achievements
const ACHIEVEMENT_FLAIRS: Record<string, string> = {
  'first_puzzle': '🧩 Novice Solver',
  'speed_demon': '⚡ Quick Thinker',
  'perfect_solver': '⭐ Perfect Solver',
  'expert_master': '👑 Puzzle Master',
  'community_creator': '🧠 Community Creator',
  'star_collector': '🌟 Star Collector',
};

async function checkAchievements(
  username: string,
  triggerData: {
    type: 'puzzle_complete' | 'community_approved';
    puzzleId?: string;
    time?: number;
    perfect?: boolean;
    difficulty?: string;
  }
): Promise<Achievement[]> {
  const newlyUnlocked: Achievement[] = [];

  try {
    // Get user's current achievements
    const achievementsKey = `achievements:${username}`;
    const achievementsData = await redis.get(achievementsKey);
    const userAchievements = achievementsData ? JSON.parse(achievementsData) : {};

    // Get user progress
    const progressKey = `user:${username}:progress`;
    const progressData = await redis.get(progressKey);
    const progress = progressData
      ? JSON.parse(progressData)
      : {
          stars: 0,
          completedPuzzles: [],
          bestTimes: {},
          totalScore: 0,
        };

    // Check each achievement
    for (const achievement of ACHIEVEMENTS_CONFIG) {
      if (userAchievements[achievement.id]) continue; // Already unlocked

      let shouldUnlock = false;

      switch (achievement.condition.type) {
        case 'first_puzzle':
          shouldUnlock =
            triggerData.type === 'puzzle_complete' && progress.completedPuzzles.length >= 1;
          break;

        case 'speed_solve':
          shouldUnlock =
            triggerData.type === 'puzzle_complete' &&
            triggerData.time !== undefined &&
            triggerData.time <= (achievement.condition.value as number);
          break;

        case 'perfect_solve':
          shouldUnlock = triggerData.type === 'puzzle_complete' && triggerData.perfect === true;
          break;

        case 'difficulty_complete':
          if (triggerData.type === 'puzzle_complete') {
            const difficulty = achievement.condition.value as string;
            const difficultyPuzzles = progress.completedPuzzles.filter(
              (id: string) =>
                id.includes(difficulty) || getDifficultyFromPuzzleId(id) === difficulty
            );
            const totalDifficultyPuzzles = getTotalPuzzlesForDifficulty(difficulty);
            shouldUnlock = difficultyPuzzles.length >= totalDifficultyPuzzles;
          }
          break;

        case 'community_approved':
          shouldUnlock = triggerData.type === 'community_approved';
          break;

        case 'total_puzzles':
          shouldUnlock =
            progress.completedPuzzles.length >= (achievement.condition.value as number);
          break;

        case 'total_stars':
          shouldUnlock = progress.stars >= (achievement.condition.value as number);
          break;
      }

      if (shouldUnlock) {
        const unlockedAchievement = {
          ...achievement,
          isUnlocked: true,
          unlockedAt: Date.now(),
        };

        userAchievements[achievement.id] = unlockedAchievement;
        newlyUnlocked.push(unlockedAchievement);
      }
    }

    // Save updated achievements
    if (newlyUnlocked.length > 0) {
      await redis.set(achievementsKey, JSON.stringify(userAchievements));
    }
  } catch (error) {
    console.error('Error checking achievements:', error);
  }

  return newlyUnlocked;
}

function getDifficultyFromPuzzleId(puzzleId: string): string {
  // Simple heuristic - in a real app you'd have a proper mapping
  if (puzzleId.includes('easy')) return 'easy';
  if (puzzleId.includes('medium')) return 'medium';
  if (puzzleId.includes('hard')) return 'hard';
  if (puzzleId.includes('expert')) return 'expert';
  return 'medium'; // default
}

function getTotalPuzzlesForDifficulty(difficulty: string): number {
  // This would be based on your actual puzzle catalog
  const counts = { easy: 6, medium: 8, hard: 6, expert: 4 };
  return counts[difficulty as keyof typeof counts] || 8;
}

async function postAchievementComment(username: string, achievement: Achievement): Promise<void> {
  try {
    const { postId } = context;
    if (!postId) return;

    const commentText = `🏅 **Achievement Unlocked!** 
    
**${achievement.title}**
${achievement.description}

Congratulations u/${username}! 🎉`;

    await reddit.submitComment({
      id: postId as `t3_${string}`,
      text: commentText,
    });
  } catch (error) {
    console.error('Error posting achievement comment:', error);
  }
}

// Get user achievements
router.get<Record<string, never>, AchievementResponse>(
  '/api/achievements',
  async (_req, res): Promise<void> => {
    try {
      const currentUser = await reddit.getCurrentUser();

      if (!currentUser) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated',
        });
        return;
      }

      const username = currentUser.username;
      const achievementsKey = `achievements:${username}`;
      const achievementsData = await redis.get(achievementsKey);
      const userAchievements = achievementsData ? JSON.parse(achievementsData) : {};

      // Build achievement list with unlock status
      const achievements = ACHIEVEMENTS_CONFIG.map((achievement) => ({
        ...achievement,
        isUnlocked: !!userAchievements[achievement.id],
        unlockedAt: userAchievements[achievement.id]?.unlockedAt,
      }));

      const totalUnlocked = achievements.filter((a) => a.isUnlocked).length;
      const lastUnlocked = achievements
        .filter((a) => a.isUnlocked && a.unlockedAt)
        .sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0))[0];

      res.json({
        status: 'success',
        achievements: {
          achievements,
          totalUnlocked,
          lastUnlocked: lastUnlocked || undefined,
        },
      });
    } catch (error) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch achievements',
      });
    }
  }
);

// Get/Set user flair preference
router.get<Record<string, never>, FlairResponse>('/api/flair', async (_req, res): Promise<void> => {
  try {
    const currentUser = await reddit.getCurrentUser();

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    const username = currentUser.username;

    // Get user's unlocked achievements to determine available flairs
    const achievementsKey = `achievements:${username}`;
    const achievementsData = await redis.get(achievementsKey);
    const userAchievements = achievementsData ? JSON.parse(achievementsData) : {};

    const availableFlairs = Object.keys(userAchievements)
      .filter((achievementId) => ACHIEVEMENT_FLAIRS[achievementId])
      .map((achievementId) => ACHIEVEMENT_FLAIRS[achievementId])
      .filter((flair): flair is string => flair !== undefined);

    // Get current flair preference
    const flairKey = `flair:${username}`;
    const flairData = await redis.get(flairKey);
    const selectedFlair = flairData || null;

    res.json({
      status: 'success',
      flair: {
        selectedFlair,
        availableFlairs,
      },
    });
  } catch (error) {
    console.error('Error fetching flair:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch flair',
    });
  }
});

router.post<Record<string, never>, FlairResponse, { flair: string }>(
  '/api/flair',
  async (req, res): Promise<void> => {
    try {
      const currentUser = await reddit.getCurrentUser();

      if (!currentUser) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated',
        });
        return;
      }

      const username = currentUser.username;
      const { flair } = req.body;

      // Verify user has unlocked this flair
      const achievementsKey = `achievements:${username}`;
      const achievementsData = await redis.get(achievementsKey);
      const userAchievements = achievementsData ? JSON.parse(achievementsData) : {};

      const availableFlairs = Object.keys(userAchievements)
        .filter((achievementId) => ACHIEVEMENT_FLAIRS[achievementId])
        .map((achievementId) => ACHIEVEMENT_FLAIRS[achievementId])
        .filter((flair): flair is string => flair !== undefined);

      if (flair && !availableFlairs.includes(flair)) {
        res.status(400).json({
          status: 'error',
          message: 'Flair not available - achievement not unlocked',
        });
        return;
      }

      // Save flair preference
      const flairKey = `flair:${username}`;
      await redis.set(flairKey, flair || '');

      // Actually set Reddit flair using Devvit API
      try {
        if (context.subredditName && flair) {
          await reddit.setUserFlair({
            subredditName: context.subredditName,
            username,
            text: flair,
            cssClass: '', // Optional CSS class
          });
          console.log(`✅ Set Reddit flair for u/${username}: ${flair}`);
        } else if (context.subredditName && !flair) {
          // Remove flair if empty
          await reddit.setUserFlair({
            subredditName: context.subredditName,
            username,
            text: '',
            cssClass: '',
          });
          console.log(`✅ Removed Reddit flair for u/${username}`);
        }
      } catch (flairError) {
        console.error('Error setting Reddit flair:', flairError);
        // Don't fail the request if flair setting fails, just log it
      }

      res.json({
        status: 'success',
        flair: {
          selectedFlair: flair,
          availableFlairs,
        },
      });
    } catch (error) {
      console.error('Error setting flair:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to set flair',
      });
    }
  }
);

// Set flair from achievement
router.post<Record<string, never>, FlairResponse, { achievementId: string }>(
  '/api/flair/achievement',
  async (req, res): Promise<void> => {
    try {
      const currentUser = await reddit.getCurrentUser();

      if (!currentUser) {
        res.status(401).json({
          status: 'error',
          message: 'User not authenticated',
        });
        return;
      }

      const username = currentUser.username;
      const { achievementId } = req.body;

      if (!achievementId) {
        res.status(400).json({
          status: 'error',
          message: 'Achievement ID is required',
        });
        return;
      }

      // Verify user has unlocked this achievement
      const achievementsKey = `achievements:${username}`;
      const achievementsData = await redis.get(achievementsKey);
      const userAchievements = achievementsData ? JSON.parse(achievementsData) : {};

      if (!userAchievements[achievementId]) {
        res.status(400).json({
          status: 'error',
          message: 'Achievement not unlocked',
        });
        return;
      }

      // Get the flair text for this achievement
      const flairText = ACHIEVEMENT_FLAIRS[achievementId];
      if (!flairText) {
        res.status(400).json({
          status: 'error',
          message: 'No flair available for this achievement',
        });
        return;
      }

      // Save flair preference
      const flairKey = `flair:${username}`;
      await redis.set(flairKey, flairText);

      // Actually set Reddit flair using Devvit API
      try {
        if (context.subredditName) {
          await reddit.setUserFlair({
            subredditName: context.subredditName,
            username,
            text: flairText,
            cssClass: '', // Optional CSS class
          });
          console.log(`✅ Set Reddit flair for u/${username}: ${flairText}`);
        }
      } catch (flairError) {
        console.error('Error setting Reddit flair:', flairError);
        // Don't fail the request if flair setting fails, just log it
      }

      // Get updated available flairs
      const availableFlairs = Object.keys(userAchievements)
        .filter((achievementId) => ACHIEVEMENT_FLAIRS[achievementId])
        .map((achievementId) => ACHIEVEMENT_FLAIRS[achievementId])
        .filter((flair): flair is string => flair !== undefined);

      res.json({
        status: 'success',
        flair: {
          selectedFlair: flairText,
          availableFlairs,
        },
      });
    } catch (error) {
      console.error('Error setting flair from achievement:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to set flair',
      });
    }
  }
);

// Get extended user profile with achievements and stats
router.get<
  Record<string, never>,
  { status: string; profile?: ExtendedUserProfile; message?: string }
>('/api/profile', async (_req, res): Promise<void> => {
  try {
    const currentUser = await reddit.getCurrentUser();

    if (!currentUser) {
      res.status(401).json({
        status: 'error',
        message: 'User not authenticated',
      });
      return;
    }

    const username = currentUser.username;

    // Get basic user data
    const progressKey = `user:${username}:progress`;
    const progressData = await redis.get(progressKey);
    const progress = progressData
      ? JSON.parse(progressData)
      : {
          stars: 0,
          unlocks: ['nature-waterfall'],
          bestTimes: {},
          completedPuzzles: [],
          totalScore: 0,
        };

    // Get achievements
    const achievementsKey = `achievements:${username}`;
    const achievementsData = await redis.get(achievementsKey);
    const userAchievements = achievementsData ? JSON.parse(achievementsData) : {};

    const achievements = ACHIEVEMENTS_CONFIG.map((achievement) => ({
      ...achievement,
      isUnlocked: !!userAchievements[achievement.id],
      unlockedAt: userAchievements[achievement.id]?.unlockedAt,
    }));

    const totalUnlocked = achievements.filter((a) => a.isUnlocked).length;
    const lastUnlocked = achievements
      .filter((a) => a.isUnlocked && a.unlockedAt)
      .sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0))[0];

    // Get flair
    const flairKey = `flair:${username}`;
    const flairData = await redis.get(flairKey);
    const selectedFlair = flairData || null;

    const availableFlairs = Object.keys(userAchievements)
      .filter((achievementId) => ACHIEVEMENT_FLAIRS[achievementId])
      .map((achievementId) => ACHIEVEMENT_FLAIRS[achievementId])
      .filter((flair): flair is string => flair !== undefined);

    // Calculate stats
    const bestTimes = progress.bestTimes as Record<string, number>;
    const totalTimePlayed = Object.values(bestTimes).reduce(
      (sum: number, time: number) => sum + time,
      0
    );
    const averageMoves =
      progress.completedPuzzles.length > 0
        ? Math.round((progress.totalScore as number) / progress.completedPuzzles.length)
        : 0;
    const highestScore = progress.totalScore as number;
    const completionRate = (progress.completedPuzzles.length / 24) * 100; // Assuming 24 total puzzles

    // Determine favorite difficulty (simplified)
    const favoriteDifficulty = 'medium'; // Would need more data to calculate properly

    const stats: ProfileStats = {
      totalTimePlayed,
      averageMoves,
      highestScore,
      completionRate,
      favoritedifficulty: favoriteDifficulty,
      longestStreak: 0, // Would need to track this separately
    };

    const profile: ExtendedUserProfile = {
      username,
      avatar: `https://www.reddit.com/user/${username}/avatar`,
      totalStars: progress.stars,
      puzzlesCompleted: progress.completedPuzzles.length,
      bestTime: Math.min(...Object.values(bestTimes), Infinity) || 0,
      rank: 1, // Simplified
      stats,
      achievements: {
        achievements,
        totalUnlocked,
        lastUnlocked,
      },
      flair: {
        selectedFlair,
        availableFlairs,
      },
    };

    res.json({
      status: 'success',
      profile,
    });
  } catch (error) {
    console.error('Error fetching extended profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile',
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = process.env.WEBBIT_PORT || 3000;

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port, () => console.log(`http://localhost:${port}`));
