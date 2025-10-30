export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type PuzzleCompletionData = {
  time: number;
  score: number;
  moves: number; // Keep for backward compatibility
  perfectCompletion: boolean;
  maxStreak: number;
  stars: number;
  userId?: string;
  puzzleId?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
};

export type PuzzleCompletionResponse = {
  status: 'success' | 'error';
  message: string;
};

export type LeaderboardEntry = {
  rank: number;
  time: number;
  moves: number;
  userId: string;
  timestamp: number;
};

export type LeaderboardResponse = {
  status: 'success' | 'error';
  leaderboard?: LeaderboardEntry[];
  message?: string;
};

export type PuzzleConfig = {
  image: string;
  imageUrl?: string;
  title?: string;
  gridCols: number;
  gridRows: number;
  gridSize?: number; // Deprecated, use gridCols/gridRows
  rotationEnabled: boolean;
  timedMode: boolean;
  timeLimit?: number; // seconds for countdown mode
  backgroundMusic?: string;
  puzzleId: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
};

export type PuzzlePiece = {
  id: number;
  correctRow: number;
  correctCol: number;
  currentRow: number;
  currentCol: number;
  rotation: number;
  isPlaced: boolean;
  isInDisplay: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sprite: any; // Phaser.GameObjects.Image - using any to avoid Phaser dependency in shared types
};

// Media upload types
export type MediaUploadRequest = {
  imageUrl?: string;
  musicUrl?: string;
  puzzleId?: string;
  trackId?: string;
};

export type MediaUploadResponse = {
  status: 'success' | 'error';
  cdnUrl?: string;
  puzzleId?: string;
  trackId?: string;
  message?: string;
};

export type PuzzleImageData = {
  cdnUrl: string;
  originalUrl: string;
  uploadedAt: number;
  puzzleId: string;
};

export type MusicTrackData = {
  cdnUrl: string;
  originalUrl: string;
  uploadedAt: number;
  trackId: string;
};

export type PuzzleImagesResponse = {
  status: 'success' | 'error';
  images?: PuzzleImageData[];
  message?: string;
};

export type MusicTracksResponse = {
  status: 'success' | 'error';
  tracks?: MusicTrackData[];
  message?: string;
};

// Auto-upload response types
export type AutoUploadResult = {
  puzzleId?: string;
  trackId?: string;
  filename: string;
  type?: string;
  cdnUrl?: string;
  status: 'success' | 'error';
  error?: string;
};

export type AutoUploadResponse = {
  status: 'success' | 'error';
  message: string;
  results?: AutoUploadResult[];
};

// Clear media response types
export type ClearMediaResponse = {
  status: 'success' | 'error';
  message: string;
  deletedCount?: number;
  deletedImages?: number;
  deletedTracks?: number;
};

// User authentication and profile types
export type UserProfile = {
  username: string;
  avatar?: string;
  totalStars: number;
  puzzlesCompleted: number;
  bestTime: number;
  rank: number;
};

export type UserProgressData = {
  stars: number;
  unlocks: string[];
  bestTimes: Record<string, number>;
  completedPuzzles: string[];
  totalScore: number;
};

export type UserResponse = {
  status: 'success' | 'error';
  user?: UserProfile;
  progress?: UserProgressData;
  message?: string;
};

export type SaveProgressRequest = {
  puzzleId: string;
  stars: number;
  time: number;
  score: number;
  unlocks?: string[];
};

export type SaveProgressResponse = {
  status: 'success' | 'error';
  message: string;
  updatedProgress?: UserProgressData;
};

// Community puzzle submission types
export type CommunityPuzzleSubmission = {
  id: string;
  title: string;
  submittedBy: string;
  imageUrl: string;
  commentId: string;
  postId?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string | undefined;
  submittedAt: number;
  processedAt?: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  aspectRatio: number;
  imageWidth: number;
  imageHeight: number;
  mimeType: string;
};

export type PuzzleValidationResult = {
  isValid: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  aspectRatio: number;
  width: number;
  height: number;
  mimeType: string;
  errors: string[];
};

export type CommunityPuzzleResponse = {
  status: 'success' | 'error';
  message: string;
  puzzle?: CommunityPuzzleSubmission;
  validationResult?: PuzzleValidationResult;
};

export type CommunityPuzzleListResponse = {
  status: 'success' | 'error';
  puzzles?: CommunityPuzzleSubmission[];
  message?: string;
};

// Share solve stats types
export type ShareSolveRequest = {
  puzzleId: string;
  time: number;
  moves: number;
  score?: number;
  perfect?: boolean;
  postId: string;
};

export type ShareSolveResponse = {
  status: 'success' | 'error';
  message: string;
};

// Achievement system types
export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
  isUnlocked: boolean;
  category: 'puzzle' | 'speed' | 'community' | 'mastery';
  condition: {
    type: 'first_puzzle' | 'speed_solve' | 'perfect_solve' | 'difficulty_complete' | 'community_submit' | 'community_approved' | 'total_puzzles' | 'total_stars';
    value?: number | string;
  };
};

export type UserAchievements = {
  achievements: Achievement[];
  totalUnlocked: number;
  lastUnlocked?: Achievement | undefined;
};

export type AchievementResponse = {
  status: 'success' | 'error';
  achievements?: UserAchievements;
  newlyUnlocked?: Achievement[];
  message?: string;
};

export type FlairPreference = {
  selectedFlair: string | null;
  availableFlairs: string[];
};

export type FlairResponse = {
  status: 'success' | 'error';
  flair?: FlairPreference;
  message?: string;
};

export type ProfileStats = {
  totalTimePlayed: number; // in seconds
  averageMoves: number;
  highestScore: number;
  completionRate: number; // percentage
  favoritedifficulty: 'easy' | 'medium' | 'hard' | 'expert';
  longestStreak: number;
};

export type ExtendedUserProfile = UserProfile & {
  stats: ProfileStats;
  achievements: UserAchievements;
  flair: FlairPreference;
};
