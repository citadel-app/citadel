export const APP_CONSTANTS = {
  SEARCH_SUGGESTION_COUNT: 5,
  MAX_HISTORY_ITEMS: 10,
  AUTO_SAVE_INTERVAL: 2000,
  PATHS: {
    CONFIG_DIR: '.codex',
    ASSETS_DIR: 'assets',
    HIGHLIGHTS_DIR: 'highlights',
    BOARD_DIR: 'whiteboards',
    CODE_DIR: 'code',
    NOTES_DIR: 'notes',
    CONFIG_FILE: 'workspace.json',
    FEED_FILE: 'feeds.json',
    YOUTUBE_FEED_FILE: 'youtube-feeds.json',
    YOUTUBE_FEED_ITEMS_FILE: 'youtube-feed-items.json',
    FEED_ITEMS_FILE: 'feed-items.json',
    NOTEBOOK_FILE: 'notebooks.json',
    LATEX_DIR: 'latex',
    TAGS_FILE: 'tags.json',
    BOARDS_FILE: 'boards.json',
    ICONS_BASE: 'assets/icons',
    BRANDING_BASE: 'assets/branding'
  },
  UI: {
    GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
    LOADING: 'Loading...',
    SAVING: 'Saving changes...',
    NO_DATA: 'No data found'
  }
};

export const TTS_API_URL = 'http://localhost:5050';
