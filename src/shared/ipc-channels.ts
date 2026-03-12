export const IPC_CHANNELS = {
    // App
    APP_GET_SETTINGS: 'app:get-settings',
    APP_UPDATE_SETTING: 'app:update-setting',
    APP_UPDATE_SETTINGS: 'app:update-settings',
    APP_GET_INIT_CONTEXT: 'app:get-init-context',
    APP_OPEN_WORKSPACE: 'app:open-workspace',
    APP_SET_ACTIVE_WORKSPACE: 'app:set-active-workspace',
    APP_ON_DEEP_LINK: 'app:onDeepLink',
    APP_ON_LOG: 'app:onLog',
    APP_GET_DOCUMENTS_PATH: 'app:getDocumentsPath',
    APP_GET_DOWNLOADS_PATH: 'app:getDownloadsPath',
    APP_CLOSE_REQUEST: 'app:close-request',
    APP_CLOSE_CONFIRMED: 'app:close-confirmed',
    APP_PING: 'ping',

    // Secrets
    SECRETS_GET: 'secrets:get',
    SECRETS_SET: 'secrets:set',
    SECRETS_DELETE: 'secrets:delete',

    // File System
    FS_WATCH_PATH: 'fs:watch-path',
    FS_ON_FILE_CHANGED: 'fs:onFileChanged',
    FS_ALLOW_PATH: 'fs:allowPath',
    FS_EXISTS: 'fs:exists',
    FS_READ_FILE: 'fs:readFile',
    FS_READ_FILE_BINARY: 'fs:readFileBinary',
    FS_WRITE_FILE: 'fs:writeFile',
    FS_WRITE_ASSET: 'fs:writeAsset',
    FS_READ_DIRECTORY: 'fs:readDirectory',
    FS_CREATE_DIRECTORY: 'fs:createDirectory',
    FS_DELETE_FILE: 'fs:deleteFile',
    FS_STAT: 'fs:stat',
    FS_RENAME: 'fs:rename',
    FS_SCAFFOLD_WORKSPACE: 'fs:scaffoldWorkspace',

    // Git
    GIT_STATUS: 'git:status',
    GIT_INIT: 'git:init',
    GIT_ADD: 'git:add',
    GIT_COMMIT: 'git:commit',
    GIT_PUSH: 'git:push',
    GIT_PULL: 'git:pull',
    GIT_ADD_REMOTE: 'git:add-remote',
    GIT_HISTORY: 'git:history',
    GIT_GET_REMOTES: 'git:get-remotes',
    GIT_SHOW: 'git:show',
    GIT_CHECK_IS_REPO: 'git:check-is-repo',
    GIT_GET_BRANCHES: 'git:get-branches',
    GIT_CHECKOUT: 'git:checkout',
    GIT_CLONE: 'git:clone',
    GIT_DISCARD: 'git:discard',
    GIT_CREATE_BRANCH: 'git:create-branch',
    GIT_DELETE_BRANCH: 'git:delete-branch',
    GIT_SET_CONFIG: 'git:setConfig',
    GIT_REMOVE_REMOTE: 'git:remove-remote',
    GIT_UNSTAGE: 'git:unstage',
    GIT_DISCARD_BULK: 'git:discard-bulk',

    // GitHub
    GITHUB_CREATE_REPOSITORY: 'github:create-repository',
    GITHUB_LIST_REPOS: 'github:list-repos',
    GITHUB_FORK_REPOSITORY: 'github:fork-repository',
    GITHUB_START_DEVICE_FLOW: 'github:start-device-flow',
    GITHUB_POLL_DEVICE_TOKEN: 'github:poll-device-token',
    GITHUB_GET_USER: 'github:get-user',

    // AI
    AI_IS_AVAILABLE: 'ai:isAvailable',
    AI_CHAT: 'ai:chat',
    AI_STREAM: 'ai:chatStream',
    AI_CHAT_CHUNK: 'ai:chat-chunk',
    AI_CHAT_END: 'ai:chat-end',
    AI_ANALYZE_INTENT: 'ai:analyzeIntent',
    AI_INDEX_ENTRY: 'ai:indexEntry',
    AI_SEARCH: 'ai:search',
    AI_GET_CONTEXT: 'ai:getContext',
    AI_GET_STRUCTURAL_CONTEXT: 'ai:getStructuralContext',
    AI_NEEDS_INDEXING: 'ai:needsIndexing',
    AI_DELETE_ENTRY_INDEX: 'ai:deleteEntryIndex',
    AI_GET_HARDWARE_SPECS: 'ai:getHardwareSpecs',
    AI_SCORE_MODEL: 'ai:scoreModel',
    AI_PULL_MODEL: 'ai:pullModel',
    AI_PULL_PROGRESS: 'ai:pull-progress',
    AI_GET_MODELS: 'ai:getModels',
    AI_ABORT_CHAT: 'ai:abortChat',
    AI_GENERATE_METADATA: 'ai:generateMetadata',
    AI_GENERATE_SUMMARY: 'ai:generateSummary',
    AI_PROOFREAD: 'ai:proofread',
    AI_GENERATE_SECTION: 'ai:generateSection',
    AI_INDEX_STATUS: 'ai:index-status',
    AI_RAG_SEARCH: 'ai:rag-search',

    // Database
    DB_INIT_WORKSPACE: 'db:init-workspace',
    DB_GET_FEED_ITEMS: 'db:getFeedItems',
    DB_SAVE_FEED_ITEMS: 'db:saveFeedItems',
    DB_GET_FEED_STATUS: 'db:getFeedStatus',
    DB_UPDATE_FEED_STATUS: 'db:updateFeedStatus',
    DB_GET_AI_INDEX_STATUS: 'db:getAIIndexStatus',
    DB_UPDATE_AI_INDEX_STATUS: 'db:updateAIIndexStatus',
    DB_DELETE_AI_INDEX_STATUS: 'db:deleteAIIndexStatus',

    // LSP
    LSP_START: 'lsp:start',
    LSP_STOP: 'lsp:stop',
    LSP_SEND: 'lsp:send',
    LSP_ON_MESSAGE: 'lsp:on-message',

    // LaTeX
    LATEX_CHECK: 'latex:check',
    LATEX_COMPILE: 'latex:compile',

    // REPL
    REPL_START_SESSION: 'repl:start-session',
    REPL_STOP_SESSION: 'repl:stop-session',
    REPL_SEND_INPUT: 'repl:send-input',
    REPL_ON_OUTPUT: 'repl:output',
    REPL_ON_CLOSED: 'repl:closed',
    REPL_LIST_CONTAINERS: 'repl:list-containers',
    REPL_STOP_CONTAINER: 'repl:stop-container',
    REPL_REMOVE_CONTAINER: 'repl:remove-container',
    REPL_CHECK_SESSION: 'repl:check-session',

    // Services
    SERVICE_START: 'service:start',
    SERVICE_STOP: 'service:stop',
    SERVICE_STATUS: 'service:status',

    // Window
    WINDOW_MINIMIZE: 'window:minimize',
    WINDOW_MAXIMIZE: 'window:maximize',
    WINDOW_CLOSE: 'window:close',
    WINDOW_SET_ZOOM: 'window:set-zoom',
    WINDOW_GET_ZOOM: 'window:get-zoom',
    WINDOW_SETUP_BUILDER: 'window:setupBuilder',
    WINDOW_SETUP_WELCOME: 'window:setupWelcome',
    WINDOW_SETUP_MAIN: 'window:setup-main',

    // Dialog
    DIALOG_OPEN_DIRECTORY: 'dialog:openDirectory',
    DIALOG_OPEN_FILE: 'dialog:openFile',

    // Network
    NET_FETCH: 'net:fetch',

    // System
    SYSTEM_GET_PROCESS_STATS: 'system:getProcessStats',
    SYSTEM_START_SERVICE: 'system:startService',
    SYSTEM_STOP_SERVICE: 'system:stopService',
    SYSTEM_DEPLOY_STACK: 'system:deployStack',
    SYSTEM_OPEN_DEV_TOOLS: 'app:openDevTools',
    DEBUG_TRIGGER_ERROR: 'debug:triggerError',

    // Commands
    COMMAND_SYNC_TO_MAIN: 'command:sync-to-main',
    COMMAND_EXECUTE_IN_RENDERER: 'command:execute-in-renderer'
} as const;
