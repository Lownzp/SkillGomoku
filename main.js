// 五子棋技能系统 - 主要游戏逻辑

// 游戏配置
const GAME_CONFIG = {
    boardSize: 15,
    maxEnergy: 5,
    initialEnergy: 3,
    energyRegenPerTurn: 1,
    debugMode: false  // 设置为true可以显示网格交点
};

// 全局配置管理器实例（将在类定义后初始化）
let gameConfigManager;

// 技能定义
const SKILLS = {
    feishazoushi: {
        id: 'feishazoushi',
        name: '飞沙走石',
        description: '移除对手场上任意一颗棋子',
        cost: 2,
        cooldown: 3,
        type: 'attack',
        emoji: '💨'
    },
    shiguangdongjie: {
        id: 'shiguangdongjie',
        name: '静如止水',
        description: '使对手跳过下一回合',
        cost: 2,
        cooldown: 4,
        type: 'control',
        emoji: '❄️'
    },
    guruojintang: {
        id: 'guruojintang',
        name: '固若金汤',
        description: '使我方已存在的棋子2回合内不可被移除',
        cost: 1,
        cooldown: 3,
        type: 'defense',
        emoji: '🛡️'
    },
    yihuajiemu: {
        id: 'yihuajiemu',
        name: '移花接木',
        description: '将我方一颗棋子移动到相邻空位',
        cost: 1,
        cooldown: 2,
        type: 'special',
        emoji: '🔄'
    },
    shiguangdaoliu: {
        id: 'shiguangdaoliu',
        name: '拾金不昧',
        description: '撤销对手上一步的落子操作',
        cost: 3,
        cooldown: 5,
        type: 'special',
        emoji: '⏪'
    },
    libashanxi: {
        id: 'libashanxi',
        name: '力拔山兮',
        description: '随机打乱场上所有棋子位置',
        cost: 4,
        cooldown: 7,
        type: 'chaos',
        emoji: '🌪️'
    },
    huadweiliao: {
        id: 'huadweiliao',
        name: '擒擒拿拿',
        description: '指定一个3x3区域，对手2回合内不能在区域内落子',
        cost: 2,
        cooldown: 4,
        type: 'control',
        emoji: '🚫'
    },
    fudichouxin: {
        id: 'fudichouxin',
        name: '釜底抽薪',
        description: '移除对手最近放置的3颗棋子',
        cost: 3,
        cooldown: 5,
        type: 'attack',
        emoji: '🔥'
    },
    baojieshangmen: {
        id: 'baojieshangmen',
        name: '保洁上门',
        description: '随机移除对方1-3颗棋子',
        cost: 2,
        cooldown: 4,
        type: 'attack',
        emoji: '🧹'
    }
};

// 回合数据格式定义
const TURN_DATA_FORMAT = {
    turnId: 'number',
    playerId: 'string',
    operationType: 'string', // 'place', 'skill', 'undo', 'pass'
    operationData: 'object',
    timestamp: 'number',
    phase: 'string', // 'preCheck', 'coreOperation', 'effectSettlement', 'turnSwitch'
    status: 'string' // 'pending', 'executing', 'completed', 'failed'
};

// 回合阶段枚举
const TURN_PHASES = {
    PRE_CHECK: 'preCheck',
    CORE_OPERATION: 'coreOperation', 
    EFFECT_SETTLEMENT: 'effectSettlement',
    TURN_SWITCH: 'turnSwitch'
};

// 操作类型枚举
const OPERATION_TYPES = {
    PLACE: 'place',
    SKILL: 'skill',
    UNDO: 'undo',
    PASS: 'pass'
};

// 回合状态枚举
const TURN_STATUS = {
    PENDING: 'pending',
    EXECUTING: 'executing',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

// 游戏配置管理器
class GameConfigManager {
    constructor() {
        this.config = {
            // 基础规则配置
            allowUndo: true,
            skillCooldown: 2,
            maxTurnHistory: 100,
            energyRegenPerTurn: 1,
            maxEnergy: 10,
            initialEnergy: 3,
            
            // 回合管理配置
            turnTimeout: 30000, // 30秒超时
            maxConcurrentTurns: 1,
            
            // 技能系统配置
            skillValidation: true,
            skillAnimation: true,
            
            // 多玩家配置
            maxPlayers: 2,
            playerTypes: ['human', 'ai'],
            
            // 异步效果配置
            asyncEffectTimeout: 5000,
            maxAsyncEffects: 3
        };
    }
    
    // 获取配置
    get(key) {
        return this.config[key];
    }
    
    // 设置配置
    set(key, value) {
        this.config[key] = value;
    }
    
    // 批量设置配置
    setConfig(newConfig) {
        Object.assign(this.config, newConfig);
    }
    
    // 获取所有配置
    getAll() {
        return { ...this.config };
    }
    
    // 重置为默认配置
    reset() {
        this.config = {
            allowUndo: true,
            skillCooldown: 2,
            maxTurnHistory: 100,
            energyRegenPerTurn: 1,
            maxEnergy: 10,
            initialEnergy: 3,
            turnTimeout: 30000,
            maxConcurrentTurns: 1,
            skillValidation: true,
            skillAnimation: true,
            maxPlayers: 2,
            playerTypes: ['human', 'ai'],
            asyncEffectTimeout: 5000,
            maxAsyncEffects: 3
        };
    }
}

// 初始化全局配置管理器实例
gameConfigManager = new GameConfigManager();

// 异步效果管理器
class AsyncEffectManager {
    constructor() {
        this.activeEffects = new Map();
        this.effectQueue = [];
        this.maxConcurrentEffects = 3;
        this.effectTimeout = 5000;
    }
    
    // 注册异步效果
    registerEffect(effectId, effectFunction, timeout = 5000) {
        const effect = {
            id: effectId,
            function: effectFunction,
            timeout: timeout,
            status: 'pending',
            startTime: Date.now()
        };
        
        this.effectQueue.push(effect);
        this.processEffectQueue();
        
        return effectId;
    }
    
    // 处理效果队列
    async processEffectQueue() {
        if (this.activeEffects.size >= this.maxConcurrentEffects) {
            return;
        }
        
        const nextEffect = this.effectQueue.shift();
        if (!nextEffect) return;
        
        this.activeEffects.set(nextEffect.id, nextEffect);
        nextEffect.status = 'running';
        
        try {
            // 设置超时
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Effect timeout')), nextEffect.timeout);
            });
            
            // 执行效果
            const effectPromise = nextEffect.function();
            
            await Promise.race([effectPromise, timeoutPromise]);
            
            nextEffect.status = 'completed';
        } catch (error) {
            console.error(`Async effect ${nextEffect.id} failed:`, error);
            nextEffect.status = 'failed';
        } finally {
            this.activeEffects.delete(nextEffect.id);
            // 继续处理队列
            this.processEffectQueue();
        }
    }
    
    // 等待所有效果完成
    async waitForAllEffects() {
        const promises = Array.from(this.activeEffects.values()).map(effect => 
            new Promise(resolve => {
                const checkStatus = () => {
                    if (effect.status === 'completed' || effect.status === 'failed') {
                        resolve(effect);
                    } else {
                        setTimeout(checkStatus, 100);
                    }
                };
                checkStatus();
            })
        );
        
        await Promise.all(promises);
    }
    
    // 获取效果状态
    getEffectStatus(effectId) {
        const effect = this.activeEffects.get(effectId) || 
                      this.effectQueue.find(e => e.id === effectId);
        return effect ? effect.status : 'not_found';
    }
}

// 回合管理器
class TurnManager {
    constructor() {
        this.currentTurnId = 0;
        this.turnHistory = [];
        this.hooks = {
            preCheck: [],
            coreOperation: [],
            effectSettlement: [],
            turnSwitch: []
        };
        this.players = ['black', 'white'];
        this.currentPlayerIndex = 0;
        this.turnConfig = {
            allowUndo: true,
            skillCooldown: 2,
            maxTurnHistory: 100
        };
        this.asyncEffectManager = new AsyncEffectManager();
    }

    // 注册钩子函数
    registerHook(phase, hookFunction) {
        if (this.hooks[phase]) {
            this.hooks[phase].push(hookFunction);
        }
    }

    // 执行钩子函数
    async executeHooks(phase, turnData) {
        const hooks = this.hooks[phase] || [];
        for (const hook of hooks) {
            try {
                await hook(turnData);
            } catch (error) {
                console.error(`Hook execution failed in phase ${phase}:`, error);
            }
        }
    }

    // 创建回合数据
    createTurnData(playerId, operationType, operationData) {
        this.currentTurnId++;
        return {
            turnId: this.currentTurnId,
            playerId: playerId,
            operationType: operationType,
            operationData: operationData,
            timestamp: Date.now(),
            phase: TURN_PHASES.PRE_CHECK,
            status: TURN_STATUS.PENDING
        };
    }

    // 执行回合
    async executeTurn(turnData) {
        try {
            // 阶段1：前置校验
            turnData.phase = TURN_PHASES.PRE_CHECK;
            await this.executeHooks(TURN_PHASES.PRE_CHECK, turnData);
            
            // 阶段2：核心操作
            turnData.phase = TURN_PHASES.CORE_OPERATION;
            await this.executeHooks(TURN_PHASES.CORE_OPERATION, turnData);
            
            // 阶段3：效果结算
            turnData.phase = TURN_PHASES.EFFECT_SETTLEMENT;
            await this.executeHooks(TURN_PHASES.EFFECT_SETTLEMENT, turnData);
            
            // 等待所有异步效果完成
            await this.asyncEffectManager.waitForAllEffects();
            
            // 阶段4：回合切换
            turnData.phase = TURN_PHASES.TURN_SWITCH;
            await this.executeHooks(TURN_PHASES.TURN_SWITCH, turnData);
            
            turnData.status = TURN_STATUS.COMPLETED;
            this.turnHistory.push(turnData);
            
            // 限制历史记录数量
            if (this.turnHistory.length > this.turnConfig.maxTurnHistory) {
                this.turnHistory.shift();
            }
            
        } catch (error) {
            turnData.status = TURN_STATUS.FAILED;
            console.error('Turn execution failed:', error);
            throw error;
        }
    }
    
    // 注册异步效果
    registerAsyncEffect(effectId, effectFunction, timeout = 5000) {
        return this.asyncEffectManager.registerEffect(effectId, effectFunction, timeout);
    }
    
    // 获取异步效果状态
    getAsyncEffectStatus(effectId) {
        return this.asyncEffectManager.getEffectStatus(effectId);
    }

    // 获取当前玩家
    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    // 切换到下一个玩家
    switchToNextPlayer() {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        return this.getCurrentPlayer();
    }

    // 获取回合历史
    getTurnHistory(limit = 10) {
        return this.turnHistory.slice(-limit);
    }

    // 获取指定回合数据
    getTurnData(turnId) {
        return this.turnHistory.find(turn => turn.turnId === turnId);
    }
}

// 规则校验器
class RuleValidator {
    constructor(gameState) {
        this.gameState = gameState;
    }

    // 验证玩家是否有行动权
    validatePlayerAction(playerId) {
        if (this.gameState.gameStatus !== 'playing') {
            throw new Error('Game is not in playing state');
        }
        if (this.gameState.currentPlayer !== playerId) {
            throw new Error(`It's not ${playerId}'s turn`);
        }
        return true;
    }

    // 验证落子位置
    validatePlacePosition(row, col) {
        if (row < 0 || row >= GAME_CONFIG.boardSize || col < 0 || col >= GAME_CONFIG.boardSize) {
            throw new Error('Position out of bounds');
        }
        if (this.gameState.board[row][col] !== null) {
            throw new Error('Position already occupied');
        }
        return true;
    }

    // 验证技能使用
    validateSkillUse(playerId, skillId) {
        const skill = SKILLS[skillId];
        if (!skill) {
            throw new Error('Skill not found');
        }
        if (this.gameState.energy[playerId] < skill.cost) {
            throw new Error('Insufficient energy');
        }
        if (this.gameState.cooldowns[playerId][skillId] > 0) {
            throw new Error('Skill on cooldown');
        }
        return true;
    }
}

// 效果执行器
class EffectExecutor {
    constructor(gameState) {
        this.gameState = gameState;
    }

    // 执行落子效果
    executePlaceEffect(turnData) {
        const { row, col } = turnData.operationData;
        const playerId = turnData.playerId;
        
        this.gameState.board[row][col] = playerId;
        this.gameState.history.push({
            type: 'move',
            player: playerId,
            row: row,
            col: col,
            timestamp: Date.now()
        });
    }

    // 执行技能效果
    executeSkillEffect(turnData) {
        const { skillId, target } = turnData.operationData;
        const playerId = turnData.playerId;
        
        // 这里可以调用现有的技能系统
        // 为了保持兼容性，暂时保留原有逻辑
        return true;
    }

    // 执行回合切换效果
    executeTurnSwitchEffect(turnData) {
        // 使用统一状态管理器更新冷却和能量
        this.gameState.stateManager.updateCooldowns();
        this.gameState.stateManager.regenEnergy(this.gameState.currentPlayer);
        
        // 增加回合计数
        this.gameState.stateManager.turnCount++;
        
        // 获取当前玩家
        const currentPlayer = this.gameState.currentPlayer;
        
        // 处理特殊状态（如静如止水）
        if (this.gameState.skipNextTurn) {
            if (this.gameState.skipNextTurn === currentPlayer) {
                this.gameState.skipNextTurn = null;
                if (this.gameState.freezeDuration) {
                    this.gameState.freezeDuration--;
                    if (this.gameState.freezeDuration <= 0) {
                        this.gameState.freezeDuration = null;
                    }
                }
                this.gameState.currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
            } else {
                this.gameState.currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
            }
        } else {
            this.gameState.currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        }
    }
}

// 统一状态管理类
class StateManager {
    constructor() {
        this.energy = { black: GAME_CONFIG.initialEnergy, white: GAME_CONFIG.initialEnergy };
        this.cooldowns = { black: {}, white: {} };
        this.skillUsageHistory = { black: [], white: [] };
        this.turnCount = 0;
        this.lastEnergyRegen = { black: 0, white: 0 };
    }
    
    // 检查技能是否可用
    canUseSkill(player, skillId, skill) {
        const playerCooldowns = this.cooldowns[player];
        const isOnCooldown = playerCooldowns[skillId] && playerCooldowns[skillId] > 0;
        const hasEnoughEnergy = this.energy[player] >= skill.cost;
        
        return !isOnCooldown && hasEnoughEnergy;
    }
    
    // 使用技能
    useSkill(player, skillId, skill) {
        if (!this.canUseSkill(player, skillId, skill)) {
            return false;
        }
        
        // 扣除能量
        this.energy[player] -= skill.cost;
        
        // 设置冷却
        this.cooldowns[player][skillId] = skill.cooldown;
        
        // 记录技能使用
        this.skillUsageHistory[player].push({
            skillId,
            turn: this.turnCount,
            timestamp: Date.now()
        });
        
        return true;
    }
    
    // 更新冷却状态
    updateCooldowns() {
        ['black', 'white'].forEach(player => {
            const cooldowns = this.cooldowns[player];
            Object.keys(cooldowns).forEach(skillId => {
                if (cooldowns[skillId] > 0) {
                    cooldowns[skillId]--;
                }
            });
        });
    }
    
    // 恢复能量
    regenEnergy(player) {
        if (this.energy[player] < GAME_CONFIG.maxEnergy) {
            this.energy[player] += GAME_CONFIG.energyRegenPerTurn;
            this.lastEnergyRegen[player] = this.turnCount;
        }
    }
    
    // 获取技能状态信息
    getSkillStatus(player, skillId) {
        const cooldown = this.cooldowns[player][skillId] || 0;
        const energy = this.energy[player];
        const skill = SKILLS[skillId];
        
        if (!skill) {
            return {
                canUse: false,
                cooldown: 0,
                energy,
                cost: 0,
                hasEnoughEnergy: false,
                isOnCooldown: false
            };
        }
        
        return {
            canUse: this.canUseSkill(player, skillId, skill),
            cooldown,
            energy,
            cost: skill.cost,
            hasEnoughEnergy: energy >= skill.cost,
            isOnCooldown: cooldown > 0
        };
    }
    
    // 获取技能使用统计
    getSkillStats(player) {
        const history = this.skillUsageHistory[player];
        const stats = {};
        
        // 统计每个技能的使用次数
        history.forEach(usage => {
            if (!stats[usage.skillId]) {
                stats[usage.skillId] = {
                    count: 0,
                    lastUsed: 0,
                    turnsSinceLastUse: 0
                };
            }
            stats[usage.skillId].count++;
            stats[usage.skillId].lastUsed = usage.turn;
        });
        
        // 计算距离上次使用的回合数
        Object.keys(stats).forEach(skillId => {
            stats[skillId].turnsSinceLastUse = this.turnCount - stats[skillId].lastUsed;
        });
        
        return stats;
    }
    
    // 获取玩家状态摘要
    getPlayerStatus(player) {
        return {
            energy: this.energy[player],
            maxEnergy: GAME_CONFIG.maxEnergy,
            cooldowns: this.cooldowns[player],
            skillStats: this.getSkillStats(player),
            turnCount: this.turnCount,
            lastEnergyRegen: this.lastEnergyRegen[player]
        };
    }
    
    // 重置状态
    reset() {
        this.energy = { black: GAME_CONFIG.initialEnergy, white: GAME_CONFIG.initialEnergy };
        this.cooldowns = { black: {}, white: {} };
        this.skillUsageHistory = { black: [], white: [] };
        this.turnCount = 0;
        this.lastEnergyRegen = { black: 0, white: 0 };
    }
}

// 游戏状态管理类
class GameState {
    constructor() {
        this.board = this.createBoard();
        this.currentPlayer = 'black';
        this.history = [];
        this.winner = null;
        this.gameStatus = 'playing';
        this.selectedSkill = null;
        this.skillMode = false;
        this.protectedPieces = { black: new Set(), white: new Set() };
        this.forbiddenAreas = [];
        this.skipNextTurn = null;
        this.protectionDuration = 0;
        this.freezeDuration = null;
        this.previewPiece = null;
        
        // 初始化统一状态管理器
        this.stateManager = new StateManager();
        
        // 技能池系统
        this.playerSkillPools = {
            black: [],
            white: []
        };
        this.playerNames = {
            black: '黑方玩家',
            white: '白方玩家'
        };
        this.gamePhase = 'skillSelection'; // 'skillSelection', 'playing', 'victory'
        
        // 初始化回合管理系统
        this.turnManager = new TurnManager();
        this.ruleValidator = new RuleValidator(this);
        this.effectExecutor = new EffectExecutor(this);
        
        // 初始化技能系统
        this.skillSystem = new SkillSystem();
        
        // 注册默认钩子
        this.setupDefaultHooks();
        
        // 注册示例技能钩子
        this.setupSkillHooks();
    }
    
    // 获取能量状态
    get energy() {
        return this.stateManager.energy;
    }
    
    // 获取冷却状态
    get cooldowns() {
        return this.stateManager.cooldowns;
    }
    
    // 设置技能相关钩子
    setupSkillHooks() {
        // 示例：静如止水技能的异步效果
        this.turnManager.registerHook(TURN_PHASES.EFFECT_SETTLEMENT, (turnData) => {
            if (turnData.operationType === OPERATION_TYPES.SKILL && 
                turnData.operationData.skillId === 'shiguangdongjie') {
                
                // 注册异步效果：延迟一回合后解除冻结
                const effectId = `freeze_${turnData.turnId}`;
                this.turnManager.registerAsyncEffect(effectId, async () => {
                    // 模拟延迟效果
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    console.log('Freeze effect completed for turn:', turnData.turnId);
                }, 2000);
            }
        });
        
        // 示例：悔棋权限检查
        this.turnManager.registerHook(TURN_PHASES.PRE_CHECK, (turnData) => {
            if (turnData.operationType === OPERATION_TYPES.UNDO) {
                // 检查是否允许悔棋
                if (!this.turnManager.turnConfig.allowUndo) {
                    throw new Error('Undo is not allowed in current game mode');
                }
                
                // 检查是否有可悔棋的历史
                if (this.turnHistory.length === 0) {
                    throw new Error('No moves to undo');
                }
            }
        });
    }
    
    // 设置默认钩子
    setupDefaultHooks() {
        // 前置校验钩子
        this.turnManager.registerHook(TURN_PHASES.PRE_CHECK, (turnData) => {
            this.ruleValidator.validatePlayerAction(turnData.playerId);
            
            if (turnData.operationType === OPERATION_TYPES.PLACE) {
                this.ruleValidator.validatePlacePosition(
                    turnData.operationData.row, 
                    turnData.operationData.col
                );
            } else if (turnData.operationType === OPERATION_TYPES.SKILL) {
                this.ruleValidator.validateSkillUse(
                    turnData.playerId, 
                    turnData.operationData.skillId
                );
            }
        });
        
        // 核心操作钩子
        this.turnManager.registerHook(TURN_PHASES.CORE_OPERATION, (turnData) => {
            if (turnData.operationType === OPERATION_TYPES.PLACE) {
                this.effectExecutor.executePlaceEffect(turnData);
            } else if (turnData.operationType === OPERATION_TYPES.SKILL) {
                const { skillId, target } = turnData.operationData;
                const success = this.skillSystem.useSkill(this, turnData.playerId, skillId, target);
                if (!success) {
                    throw new Error(`Skill ${skillId} execution failed`);
                }
            }
        });
        
        // 效果结算钩子
        this.turnManager.registerHook(TURN_PHASES.EFFECT_SETTLEMENT, (turnData) => {
            // 检查游戏是否结束
            const winner = this.checkGameEnd();
            if (winner) {
                this.winner = winner;
                this.gameStatus = 'ended';
            }
        });
        
        // 回合切换钩子
        this.turnManager.registerHook(TURN_PHASES.TURN_SWITCH, (turnData) => {
            this.effectExecutor.executeTurnSwitchEffect(turnData);
        });
    }
    
    // 新的回合执行方法
    async executeTurn(operationType, operationData) {
        const playerId = this.currentPlayer;
        const turnData = this.turnManager.createTurnData(playerId, operationType, operationData);
        
        try {
            await this.turnManager.executeTurn(turnData);
            return { success: true, turnData: turnData };
        } catch (error) {
            console.error('Turn execution failed:', error);
            return { success: false, error: error.message, turnData: turnData };
        }
    }
    
    // 获取回合历史
    getTurnHistory(limit = 10) {
        return this.turnManager.getTurnHistory(limit);
    }
    
    // 获取指定回合数据
    getTurnData(turnId) {
        return this.turnManager.getTurnData(turnId);
    }
    
    // 检查游戏是否结束
    checkGameEnd() {
        // 检查最后一步是否获胜
        if (this.history.length > 0) {
            const lastMove = this.history[this.history.length - 1];
            if (lastMove.type === 'move') {
                if (VictoryChecker.checkWin(this.board, lastMove.row, lastMove.col, lastMove.player)) {
                    return lastMove.player;
                }
            }
        }
        return null;
    }
    
    createBoard() {
        const board = [];
        for (let i = 0; i < GAME_CONFIG.boardSize; i++) {
            board[i] = new Array(GAME_CONFIG.boardSize).fill(null);
        }
        return board;
    }
}

// 胜利检测类
class VictoryChecker {
    static checkWin(board, row, col, player) {
        const directions = [
            [0, 1],   // 水平
            [1, 0],   // 垂直  
            [1, 1],   // 对角线
            [1, -1]   // 反对角线
        ];
        
        for (let [dr, dc] of directions) {
            let count = 1;
            
            // 正向检查
            for (let i = 1; i < 5; i++) {
                const newRow = row + dr * i;
                const newCol = col + dc * i;
                if (VictoryChecker.isValidPosition(newRow, newCol) && board[newRow][newCol] === player) {
                    count++;
                } else {
                    break;
                }
            }
            
            // 反向检查
            for (let i = 1; i < 5; i++) {
                const newRow = row - dr * i;
                const newCol = col - dc * i;
                if (VictoryChecker.isValidPosition(newRow, newCol) && board[newRow][newCol] === player) {
                    count++;
                } else {
                    break;
                }
            }
            
            if (count >= 5) {
                return true;
            }
        }
        return false;
    }
    
    static isValidPosition(row, col) {
        return row >= 0 && row < GAME_CONFIG.boardSize && 
               col >= 0 && col < GAME_CONFIG.boardSize;
    }
}

// 技能系统类
class SkillSystem {
    constructor() {
        this.skills = SKILLS;
    }
    
    canUseSkill(gameState, player, skillId) {
        const skill = this.skills[skillId];
        if (!skill) return false;
        
        return gameState.stateManager.canUseSkill(player, skillId, skill);
    }
    
    isValidTarget(gameState, skillId, target) {
        const { row, col } = target;
        
        // 检查位置是否在棋盘范围内
        if (row < 0 || row >= GAME_CONFIG.boardSize || col < 0 || col >= GAME_CONFIG.boardSize) {
            return false;
        }
        
        switch (skillId) {
            case 'feishazoushi':
                // 飞沙走石：目标位置必须有对手棋子
                const opponent = gameState.currentPlayer === 'black' ? 'white' : 'black';
                return gameState.board[row][col] === opponent;
                
            case 'shiguangdaoliu':
                // 拾金不昧：目标位置必须有棋子（任何棋子都可以）
                return gameState.board[row][col] !== null;
                
            case 'yihuajiemu':
                // 移花接木：目标位置必须为空
                return gameState.board[row][col] === null;
                
            case 'huadweiliao':
                // 擒擒拿拿：目标位置必须为空，且能创建3x3区域
                if (gameState.board[row][col] !== null) return false;
                return row >= 1 && row < GAME_CONFIG.boardSize - 1 && 
                       col >= 1 && col < GAME_CONFIG.boardSize - 1;
                
            default:
                // 其他技能不需要目标验证
                return true;
        }
    }
    
    useSkill(gameState, player, skillId, target) {
        const skill = this.skills[skillId];
        if (!this.canUseSkill(gameState, player, skillId)) {
            return false;
        }
        
        // 对于需要目标位置的技能，先验证目标是否有效
        if (target && target.row !== undefined && target.col !== undefined) {
            if (!this.isValidTarget(gameState, skillId, target)) {
                return false;
            }
        }
        
        // 先执行技能效果
        const success = this.executeSkillEffect(gameState, skillId, target);
        
        if (success) {
            // 只有技能执行成功才扣除能量和设置冷却
            gameState.energy[player] -= skill.cost;
            gameState.cooldowns[player][skillId] = skill.cooldown;
            
            // 记录技能使用
            gameState.history.push({
                type: 'skill',
                player: player,
                skillId: skillId,
                target: target,
                timestamp: Date.now()
            });
        }
        
        return success;
    }
    
    executeSkillEffect(gameState, skillId, target) {
        switch (skillId) {
            case 'feishazoushi':
                return this.executeFeiShaZouShi(gameState, target);
            case 'shiguangdongjie':
                return this.executeShiGuangDongJie(gameState);
            case 'guruojintang':
                return this.executeGuRuoJinTang(gameState);
            case 'yihuajiemu':
                return this.executeYiHuaJieMu(gameState, target);
            case 'shiguangdaoliu':
                return this.executeShiGuangDaoLiu(gameState);
            case 'libashanxi':
                return this.executeLiBaShanXi(gameState);
            case 'huadweiliao':
                return this.executeHuaDiWeiLiao(gameState, target);
            case 'fudichouxin':
                return this.executeFuDiChouXin(gameState);
            case 'baojieshangmen':
                return this.executeBaoJieShangMen(gameState);
            default:
                return false;
        }
    }
    
    executeFeiShaZouShi(gameState, target) {
        const { row, col } = target;
        const opponent = gameState.currentPlayer === 'black' ? 'white' : 'black';
        
        if (gameState.board[row][col] === opponent && 
            !gameState.protectedPieces[opponent].has(`${row},${col}`)) {
            gameState.board[row][col] = null;
            animationManager.playSkillEffect('feishazoushi', {row, col});
            return true;
        }
        return false;
    }
    
    executeShiGuangDongJie(gameState) {
        const opponent = gameState.currentPlayer === 'black' ? 'white' : 'black';
        gameState.skipNextTurn = opponent;
        gameState.freezeDuration = 1; // 冻结持续1回合
        console.log('Time freeze used by', gameState.currentPlayer, 'opponent', opponent, 'will be skipped');
        // 不需要额外回合，因为使用技能本身就算一个回合
        animationManager.createFreezeEffect();
        return true;
    }
    
    executeGuRuoJinTang(gameState) {
        const player = gameState.currentPlayer;
        for (let i = 0; i < GAME_CONFIG.boardSize; i++) {
            for (let j = 0; j < GAME_CONFIG.boardSize; j++) {
                if (gameState.board[i][j] === player) {
                    gameState.protectedPieces[player].add(`${i},${j}`);
                }
            }
        }
        
        gameState.protectionDuration = 2;
        return true;
    }
    
    executeYiHuaJieMu(gameState, target) {
        const { fromRow, fromCol, toRow, toCol } = target;
        const player = gameState.currentPlayer;
        
        if (gameState.board[fromRow][fromCol] === player && 
            gameState.board[toRow][toCol] === null) {
            
            const distance = Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol);
            if (distance === 1) {
                gameState.board[fromRow][fromCol] = null;
                gameState.board[toRow][toCol] = player;
                return true;
            }
        }
        return false;
    }
    
    executeShiGuangDaoLiu(gameState) {
        if (gameState.history.length > 0) {
            const lastMove = gameState.history[gameState.history.length - 1];
            if (lastMove.type === 'move') {
                gameState.board[lastMove.row][lastMove.col] = null;
                gameState.history.pop();
                animationManager.createTimeRipple(lastMove);
                return true;
            }
        }
        return false;
    }
    
    executeLiBaShanXi(gameState) {
        const pieces = [];
        for (let i = 0; i < GAME_CONFIG.boardSize; i++) {
            for (let j = 0; j < GAME_CONFIG.boardSize; j++) {
                if (gameState.board[i][j]) {
                    pieces.push({
                        row: i,
                        col: j,
                        player: gameState.board[i][j]
                    });
                    gameState.board[i][j] = null;
                }
            }
        }
        
        const emptyPositions = [];
        for (let i = 0; i < GAME_CONFIG.boardSize; i++) {
            for (let j = 0; j < GAME_CONFIG.boardSize; j++) {
                emptyPositions.push({ row: i, col: j });
            }
        }
        
        for (let i = emptyPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [emptyPositions[i], emptyPositions[j]] = [emptyPositions[j], emptyPositions[i]];
        }
        
        pieces.forEach((piece, index) => {
            if (index < emptyPositions.length) {
                const pos = emptyPositions[index];
                gameState.board[pos.row][pos.col] = piece.player;
            }
        });
        
        animationManager.createEarthquakeEffect();
        return true;
    }
    
    executeHuaDiWeiLiao(gameState, target) {
        const { centerRow, centerCol } = target;
        
        // 验证3x3区域是否在棋盘范围内
        if (centerRow < 1 || centerRow >= GAME_CONFIG.boardSize - 1 ||
            centerCol < 1 || centerCol >= GAME_CONFIG.boardSize - 1) {
            return false;
        }
        
        const forbiddenArea = {
            centerRow,
            centerCol,
            duration: 2,
            player: gameState.currentPlayer
        };
        
        gameState.forbiddenAreas.push(forbiddenArea);
        return true;
    }
    
    executeFuDiChouXin(gameState) {
        const opponent = gameState.currentPlayer === 'black' ? 'white' : 'black';
        const recentMoves = gameState.history
            .filter(move => move.type === 'move' && move.player === opponent)
            .slice(-3);
        
        let removed = 0;
        recentMoves.forEach(move => {
            if (gameState.board[move.row][move.col] === opponent &&
                !gameState.protectedPieces[opponent].has(`${move.row},${move.col}`)) {
                gameState.board[move.row][move.col] = null;
                removed++;
            }
        });
        
        return removed > 0;
    }
    
    executeBaoJieShangMen(gameState) {
        const opponent = gameState.currentPlayer === 'black' ? 'white' : 'black';
        
        // 收集所有对手的棋子位置
        const opponentPieces = [];
        for (let row = 0; row < GAME_CONFIG.boardSize; row++) {
            for (let col = 0; col < GAME_CONFIG.boardSize; col++) {
                if (gameState.board[row][col] === opponent &&
                    !gameState.protectedPieces[opponent].has(`${row},${col}`)) {
                    opponentPieces.push({ row, col });
                }
            }
        }
        
        if (opponentPieces.length === 0) {
            return false;
        }
        
        // 随机决定移除1-3颗棋子
        const removeCount = Math.min(
            Math.floor(Math.random() * 3) + 1, // 1-3颗
            opponentPieces.length // 不超过现有棋子数量
        );
        
        // 随机选择要移除的棋子
        const shuffled = [...opponentPieces].sort(() => Math.random() - 0.5);
        const toRemove = shuffled.slice(0, removeCount);
        
        // 移除选中的棋子
        toRemove.forEach(({ row, col }) => {
            gameState.board[row][col] = null;
            animationManager.playSkillEffect('baojieshangmen', { row, col });
        });
        
        console.log(`保洁上门移除了${toRemove.length}颗${opponent}棋子`);
        return true;
    }
    
    updateCooldowns(gameState) {
        ['black', 'white'].forEach(player => {
            const cooldowns = gameState.cooldowns[player];
            Object.keys(cooldowns).forEach(skillId => {
                if (cooldowns[skillId] > 0) {
                    cooldowns[skillId]--;
                }
            });
        });
        
        gameState.forbiddenAreas = gameState.forbiddenAreas.filter(area => {
            area.duration--;
            return area.duration > 0;
        });
        
        if (gameState.protectionDuration > 0) {
            gameState.protectionDuration--;
            if (gameState.protectionDuration === 0) {
                gameState.protectedPieces.black.clear();
                gameState.protectedPieces.white.clear();
            }
        }
    }
    
    // 使用技能的主要方法
    useSkill(gameState, player, skillId, target) {
        console.log('SkillSystem.useSkill called:', { skillId, player, target });
        
        // 检查技能是否可以使用
        if (!this.canUseSkill(gameState, player, skillId)) {
            console.log('Cannot use skill:', skillId, 'not available');
            return false;
        }
        
        // 检查目标是否有效
        if (target && Object.keys(target).length > 0 && !this.isValidTarget(gameState, skillId, target)) {
            console.log('Invalid target for skill:', skillId, target);
            return false;
        }
        
        // 执行技能效果
        const success = this.executeSkillEffect(gameState, skillId, target);
        
        if (success) {
            // 使用统一状态管理器处理能量和冷却
            const skill = this.skills[skillId];
            gameState.stateManager.useSkill(player, skillId, skill);
            
            // 记录技能使用历史
            gameState.history.push({
                type: 'skill',
                player: player,
                skillId: skillId,
                target: target,
                timestamp: Date.now()
            });
            
            console.log('Skill executed successfully:', skillId);
        }
        
        return success;
    }
}

// 动画系统类
class AnimationManager {
    constructor() {
        this.activeAnimations = new Set();
    }
    
    playSkillEffect(skillId, target) {
        switch (skillId) {
            case 'feishazoushi':
                this.createSandEffect(target);
                break;
            case 'shiguangdaoliu':
                this.createTimeRipple(target);
                break;
            case 'libashanxi':
                this.createEarthquakeEffect();
                break;
            case 'shiguangdongjie':
                this.createFreezeEffect();
                break;
            default:
                this.createGenericEffect(target);
        }
    }
    
    createSandEffect(target) {
        const container = document.getElementById('particleContainer');
        if (!container) return;
        
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${target.col * 30 + 15}px`;
            particle.style.top = `${target.row * 30 + 15}px`;
            container.appendChild(particle);
            
            anime({
                targets: particle,
                translateX: (Math.random() - 0.5) * 100,
                translateY: (Math.random() - 0.5) * 100,
                opacity: [1, 0],
                scale: [1, 0],
                duration: 1000,
                easing: 'easeOutQuart',
                complete: () => particle.remove()
            });
        }
    }
    
    createTimeRipple(target) {
        const container = document.getElementById('particleContainer');
        if (!container) return;
        
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.left = `${target.col * 30}px`;
        ripple.style.top = `${target.row * 30}px`;
        ripple.style.width = '30px';
        ripple.style.height = '30px';
        ripple.style.border = '2px solid var(--gold-accent)';
        ripple.style.borderRadius = '50%';
        ripple.style.opacity = '0.8';
        container.appendChild(ripple);
        
        anime({
            targets: ripple,
            scale: [0, 3],
            opacity: [0.8, 0],
            duration: 1500,
            easing: 'easeOutQuart',
            complete: () => ripple.remove()
        });
    }
    
    createEarthquakeEffect() {
        const board = document.getElementById('gameBoard');
        if (!board) return;
        
        anime({
            targets: board,
            translateX: [0, -5, 5, -5, 5, 0],
            duration: 500,
            easing: 'easeInOutSine'
        });
    }
    
    createFreezeEffect() {
        const container = document.getElementById('particleContainer');
        if (!container) return;
        
        const freeze = document.createElement('div');
        freeze.style.position = 'absolute';
        freeze.style.left = '0';
        freeze.style.top = '0';
        freeze.style.width = '100%';
        freeze.style.height = '100%';
        freeze.style.background = 'rgba(100, 150, 255, 0.1)';
        freeze.style.border = '2px solid #6496ff';
        container.appendChild(freeze);
        
        anime({
            targets: freeze,
            opacity: [0.1, 0.3, 0.1, 0],
            duration: 2000,
            easing: 'easeInOutSine',
            complete: () => freeze.remove()
        });
    }
    
    createGenericEffect(target) {
        const container = document.getElementById('particleContainer');
        if (!container) return;
        
        const flash = document.createElement('div');
        flash.style.position = 'absolute';
        flash.style.left = `${target.col * 30}px`;
        flash.style.top = `${target.row * 30}px`;
        flash.style.width = '30px';
        flash.style.height = '30px';
        flash.style.background = 'var(--gold-accent)';
        flash.style.opacity = '0.5';
        container.appendChild(flash);
        
        anime({
            targets: flash,
            scale: [0, 1.5, 0],
            opacity: [0, 0.8, 0],
            duration: 800,
            easing: 'easeOutQuart',
            complete: () => flash.remove()
        });
    }
    
    showVictoryAnimation(winner) {
        const modal = document.getElementById('victoryModal');
        if (modal) {
            modal.classList.remove('hidden');
            
            anime({
                targets: '.victory-content',
                scale: [0, 1],
                opacity: [0, 1],
                duration: 600,
                easing: 'easeOutBack'
            });
        }
    }
}

// UI管理类
class UIManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.isMouseOverButton = false;
        this.isMouseOverTooltip = false;
        this.initializeUI();
    }
    
    initializeUI() {
        this.createSkillButtons();
        this.updateGameStatus();
        this.initializeCanvas();
    }
    
    createSkillButtons() {
        const skillList = document.getElementById('skillList');
        const skillListMobile = document.getElementById('skillListMobile');
        
        console.log('Creating skill buttons...', { skillList, skillListMobile });
        
        if (!skillList || !skillListMobile) {
            console.error('Skill list elements not found!');
            return;
        }
        
        // 清空现有按钮
        skillList.innerHTML = '';
        skillListMobile.innerHTML = '';
        
        // 根据当前玩家显示对应的技能池
        const currentPlayer = this.gameManager.gameState.currentPlayer;
        const playerSkills = this.gameManager.gameState.playerSkillPools[currentPlayer] || [];
        
        console.log(`Creating buttons for ${currentPlayer} player with ${playerSkills.length} skills`);
        
        // 为当前玩家的技能池中的每个技能创建按钮
        playerSkills.forEach(skillId => {
            const skill = SKILLS[skillId];
            if (skill) {
                console.log('Creating button for skill:', skill.name);
                // 桌面端技能按钮
                const button = this.createSkillButton(skill);
                skillList.appendChild(button);
                
                // 移动端技能按钮
                const mobileButton = this.createSkillButton(skill, true);
                skillListMobile.appendChild(mobileButton);
            }
        });
        
        console.log('Skill buttons created successfully');
    }
    
    recreateSkillButtons() {
        // 清除现有的技能按钮
        const skillList = document.getElementById('skillList');
        const skillListMobile = document.getElementById('skillListMobile');
        
        if (skillList) {
            skillList.innerHTML = '';
        }
        if (skillListMobile) {
            skillListMobile.innerHTML = '';
        }
        
        // 重新创建技能按钮
        this.createSkillButtons();
    }
    
    // 技能选择界面管理
    showSkillSelection() {
        const modal = document.getElementById('skillSelectionModal');
        if (modal) {
            modal.style.display = 'flex';
            this.initializeSkillSelection();
        }
    }
    
    hideSkillSelection() {
        const modal = document.getElementById('skillSelectionModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    initializeSkillSelection() {
        this.currentSelectingPlayer = 'black';
        this.selectedSkills = [];
        this.updateSkillSelectionUI();
        this.createSkillSelectionButtons();
        this.setupSkillSelectionEvents();
    }
    
    createSkillSelectionButtons() {
        const grid = document.getElementById('skillSelectionGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        Object.values(SKILLS).forEach(skill => {
            const button = document.createElement('div');
            button.className = 'skill-selection-button';
            button.dataset.skillId = skill.id;
            
            button.innerHTML = `
                <div class="text-lg font-bold mb-2">${skill.emoji} ${skill.name}</div>
                <div class="text-sm mb-2">${skill.description}</div>
                <div class="text-xs">
                    <span>⚡ ${skill.cost}</span> | 
                    <span>⏱️ ${skill.cooldown}回合</span> | 
                    <span>${skill.type}</span>
                </div>
            `;
            
            button.addEventListener('click', () => this.toggleSkillSelection(skill.id));
            grid.appendChild(button);
        });
    }
    
    toggleSkillSelection(skillId) {
        const button = document.querySelector(`[data-skill-id="${skillId}"]`);
        if (!button) return;
        
        const isSelected = this.selectedSkills.includes(skillId);
        
        if (isSelected) {
            // 取消选择
            this.selectedSkills = this.selectedSkills.filter(id => id !== skillId);
            button.classList.remove('selected');
        } else {
            // 选择技能
            if (this.selectedSkills.length >= 6) {
                alert('最多只能选择6个技能！');
                return;
            }
            this.selectedSkills.push(skillId);
            button.classList.add('selected');
        }
        
        this.updateSkillSelectionUI();
    }
    
    updateSkillSelectionUI() {
        const title = document.getElementById('currentPlayerTitle');
        const count = document.getElementById('selectedCount');
        const confirmBtn = document.getElementById('confirmSkillSelection');
        
        if (title) {
            const playerName = this.gameManager.gameState.playerNames[this.currentSelectingPlayer];
            title.textContent = `${playerName}选择技能`;
        }
        
        if (count) {
            count.textContent = this.selectedSkills.length;
        }
        
        if (confirmBtn) {
            confirmBtn.disabled = this.selectedSkills.length !== 6;
        }
    }
    
    setupSkillSelectionEvents() {
        const confirmBtn = document.getElementById('confirmSkillSelection');
        if (confirmBtn) {
            confirmBtn.onclick = () => this.confirmSkillSelection();
        }
    }
    
    confirmSkillSelection() {
        if (this.selectedSkills.length !== 6) {
            alert('请选择6个技能！');
            return;
        }
        
        // 保存当前玩家的技能池
        this.gameManager.gameState.playerSkillPools[this.currentSelectingPlayer] = [...this.selectedSkills];
        
        // 保存玩家名称
        const blackName = document.getElementById('blackPlayerName').value || '黑方玩家';
        const whiteName = document.getElementById('whitePlayerName').value || '白方玩家';
        this.gameManager.gameState.playerNames.black = blackName;
        this.gameManager.gameState.playerNames.white = whiteName;
        
        if (this.currentSelectingPlayer === 'black') {
            // 切换到白方选择
            this.currentSelectingPlayer = 'white';
            this.selectedSkills = [];
            this.updateSkillSelectionUI();
            this.createSkillSelectionButtons();
        } else {
            // 完成技能选择，开始游戏
            this.gameManager.startGameWithSkillPools();
            this.hideSkillSelection();
        }
    }
    
    createSkillButton(skill, isMobile = false) {
        const button = document.createElement('div');
        button.className = `skill-button ${isMobile ? 'mobile' : ''}`;
        button.id = `skill-${skill.id}${isMobile ? '-mobile' : ''}`;
        
        if (isMobile) {
            // 移动端使用统一的特殊技能颜色
            button.style.cssText = `
                background: linear-gradient(135deg, #d4af37, #b8860b);
                border: none;
                border-radius: 12px;
                padding: 8px;
                margin: 4px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 3px 6px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1);
                min-width: 80px;
                text-align: center;
            `;
            
        button.innerHTML = `
                <div class="skill-content" style="text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 4px;">${skill.emoji}</div>
                    <div class="skill-name skill-font" style="font-size: 12px; font-weight: bold; margin-bottom: 2px; color: #1a1a1a; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">${skill.name}</div>
                    <div class="skill-cost" style="font-size: 10px; color: #1a1a1a; font-weight: 600; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">${skill.cost}⚡</div>
                    <div class="skill-cooldown" style="font-size: 10px; color: #1a1a1a; font-weight: 600; text-shadow: 0 1px 2px rgba(255,255,255,0.8);" id="cooldown-${skill.id}"></div>
                </div>
            `;
        } else {
            // 桌面端方形卡片样式，根据技能类型设置不同颜色
            const typeColors = {
                attack: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                defense: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
                control: 'linear-gradient(135deg, #a8e6cf, #7fcdcd)',
                special: 'linear-gradient(135deg, #d4af37, #b8860b)',
                chaos: 'linear-gradient(135deg, #ff9ff3, #f368e0)'
            };
            
            // 根据技能类型设置文字颜色
            const textColors = {
                attack: '#ffffff',
                defense: '#1a1a1a',
                control: '#1a1a1a',
                special: '#1a1a1a',
                chaos: '#1a1a1a'
            };
            
            const textShadow = {
                attack: '0 1px 3px rgba(0,0,0,0.8)',
                defense: '0 1px 2px rgba(255,255,255,0.8)',
                control: '0 1px 2px rgba(255,255,255,0.8)',
                special: '0 1px 2px rgba(255,255,255,0.8)',
                chaos: '0 1px 2px rgba(255,255,255,0.8)'
            };
            
            const textColor = textColors[skill.type] || textColors.special;
            const shadow = textShadow[skill.type] || textShadow.special;
            
            button.style.cssText = `
                background: ${typeColors[skill.type] || typeColors.special};
                border: none;
                border-radius: 8px;
                padding: 12px;
                margin: 0;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1);
                aspect-ratio: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                min-height: 100px;
            `;
            
            button.innerHTML = `
                <div class="skill-content" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                    <div style="font-size: 32px; margin-bottom: 8px;">${skill.emoji}</div>
                    <div class="skill-name skill-font" style="font-size: 12px; font-weight: bold; margin-bottom: 4px; line-height: 1.2; color: ${textColor}; text-shadow: ${shadow};">${skill.name}</div>
                    <div class="skill-cost" style="font-size: 10px; color: ${textColor}; margin-bottom: 2px; font-weight: 600; text-shadow: ${shadow};">${skill.cost}⚡</div>
                    <div class="skill-cooldown" style="font-size: 10px; color: ${textColor}; font-weight: 600; text-shadow: ${shadow};" id="cooldown-${skill.id}"></div>
            </div>
        `;
        }
        
        button.addEventListener('click', () => {
            console.log('Skill button clicked:', skill.name);
            this.gameManager.selectSkill(skill.id);
        });
        
        // 添加鼠标悬停事件显示技能介绍
        
        button.addEventListener('mouseenter', (e) => {
            this.isMouseOverButton = true;
            // 清除之前的隐藏定时器
            if (button.tooltipTimeout) {
                clearTimeout(button.tooltipTimeout);
                button.tooltipTimeout = null;
            }
            this.showSkillTooltip(e, skill);
        });
        
        button.addEventListener('mouseleave', (e) => {
            this.isMouseOverButton = false;
            
            // 延迟隐藏，给用户时间移动到提示框
            button.tooltipTimeout = setTimeout(() => {
                if (!this.isMouseOverButton && !this.isMouseOverTooltip) {
                    this.hideSkillTooltip();
                }
            }, 150);
        });
        
        // 添加鼠标移动事件监听器
        button.addEventListener('mousemove', (e) => {
            // 鼠标在按钮上移动时，确保提示框保持显示
            if (button.tooltipTimeout) {
                clearTimeout(button.tooltipTimeout);
                button.tooltipTimeout = null;
            }
        });
        
        // 移动端触摸事件
        if (isMobile) {
            let touchTimer = null;
            
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                touchTimer = setTimeout(() => {
                    this.showSkillTooltip(e, skill);
                }, 500); // 长按500ms显示提示
            });
            
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (touchTimer) {
                    clearTimeout(touchTimer);
                    touchTimer = null;
                }
                this.hideSkillTooltip();
            });
            
            button.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (touchTimer) {
                    clearTimeout(touchTimer);
                    touchTimer = null;
                }
                this.hideSkillTooltip();
            });
        }
        
        return button;
    }
    
    updateGameStatus() {
        const gameState = this.gameManager.gameState;
        const statusElement = document.getElementById('gameStatus');
        
        console.log('Updating game status:', gameState);
        
        if (statusElement) {
            const currentPlayerName = gameState.currentPlayer === 'black' ? '黑方' : '白方';
            
            if (gameState.gameStatus === 'playing') {
                statusElement.textContent = `${currentPlayerName}回合 - 请${gameState.skillMode ? '选择技能目标' : '落子'}`;
            } else if (gameState.gameStatus === 'victory') {
                statusElement.textContent = `${gameState.winner === 'black' ? '黑方' : '白方'}获胜！`;
            }
        }
        
        this.updateEnergyDisplay();
        this.updateSkillStatus();
    }
    
    updateEnergyDisplay() {
        const gameState = this.gameManager.gameState;
        
        // 黑方能量
        const blackEnergyElement = document.getElementById('blackEnergy');
        const blackEnergyTextElement = document.getElementById('blackEnergyText');
        
        if (blackEnergyElement && blackEnergyTextElement) {
            const blackEnergyPercent = (gameState.energy.black / GAME_CONFIG.maxEnergy) * 100;
            blackEnergyElement.style.width = `${blackEnergyPercent}%`;
            blackEnergyTextElement.textContent = `${gameState.energy.black} / ${GAME_CONFIG.maxEnergy}`;
        }
        
        // 白方能量
        const whiteEnergyElement = document.getElementById('whiteEnergy');
        const whiteEnergyTextElement = document.getElementById('whiteEnergyText');
        
        if (whiteEnergyElement && whiteEnergyTextElement) {
            const whiteEnergyPercent = (gameState.energy.white / GAME_CONFIG.maxEnergy) * 100;
            whiteEnergyElement.style.width = `${whiteEnergyPercent}%`;
            whiteEnergyTextElement.textContent = `${gameState.energy.white} / ${GAME_CONFIG.maxEnergy}`;
        }
    }
    
    updateSkillStatus() {
        const gameState = this.gameManager.gameState;
        const currentPlayer = gameState.currentPlayer;
        
        console.log('Updating skill status for player:', currentPlayer);
        
        Object.values(SKILLS).forEach(skill => {
            const desktopButton = document.getElementById(`skill-${skill.id}`);
            const mobileButton = document.getElementById(`skill-${skill.id}-mobile`);
            const cooldownElement = document.getElementById(`cooldown-${skill.id}`);
            
            const buttons = [desktopButton, mobileButton].filter(btn => btn !== null);
            const canUse = this.canUseSkill(gameState, currentPlayer, skill);
            
            console.log(`Skill ${skill.name}: canUse=${canUse}, buttons found=${buttons.length}`);
            
            buttons.forEach(button => {
                if (!button) return;
                
                // 重置按钮状态
                    button.classList.remove('disabled', 'on-cooldown');
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
                button.style.filter = 'none';
                
                if (!canUse) {
                    button.classList.add('disabled');
                    button.style.opacity = '0.5';
                    button.style.cursor = 'not-allowed';
                    
                    const cooldown = gameState.cooldowns[currentPlayer][skill.id] || 0;
                    if (cooldown > 0) {
                        button.classList.add('on-cooldown');
                        button.style.filter = 'grayscale(0.7)';
                    }
                }
            });
            
            if (cooldownElement) {
                if (canUse) {
                    cooldownElement.textContent = '';
                } else {
                    // 使用统一状态管理器获取技能状态
                    const skillStatus = gameState.stateManager.getSkillStatus(currentPlayer, skill.id);
                    
                    if (skillStatus.isOnCooldown) {
                        cooldownElement.textContent = `冷却: ${skillStatus.cooldown}回合`;
                    } else if (!skillStatus.hasEnoughEnergy) {
                        cooldownElement.textContent = '能量不足';
                    }
                    
                    // 确保冷却时间文字使用正确的颜色
                    const textColors = {
                        attack: '#ffffff',
                        defense: '#1a1a1a',
                        control: '#1a1a1a',
                        special: '#1a1a1a',
                        chaos: '#1a1a1a'
                    };
                    
                    const textShadow = {
                        attack: '0 1px 3px rgba(0,0,0,0.8)',
                        defense: '0 1px 2px rgba(255,255,255,0.8)',
                        control: '0 1px 2px rgba(255,255,255,0.8)',
                        special: '0 1px 2px rgba(255,255,255,0.8)',
                        chaos: '0 1px 2px rgba(255,255,255,0.8)'
                    };
                    
                    const textColor = textColors[skill.type] || textColors.special;
                    const shadow = textShadow[skill.type] || textShadow.special;
                    
                    cooldownElement.style.color = textColor;
                    cooldownElement.style.textShadow = shadow;
                }
            }
        });
    }
    
    canUseSkill(gameState, player, skill) {
        // 如果当前玩家在技能模式，不能使用其他技能
        if (gameState.skillMode && gameState.currentPlayer === player) {
            return false;
        }
        
        return gameState.stateManager.canUseSkill(player, skill.id, skill);
    }
    
    initializeCanvas() {
        const canvas = document.getElementById('gameBoard');
        if (!canvas) {
            console.error('Canvas element not found!');
            return;
        }
        
        console.log('Initializing canvas...');
        
        // 设置Canvas的初始尺寸
        this.resizeCanvas();
        
        // 等待一帧确保Canvas尺寸设置完成
        requestAnimationFrame(() => {
            this.resizeCanvas();
        });
        
        const ctx = canvas.getContext('2d');
        
        // 统一的坐标计算函数
        const calculateBoardPosition = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            const canvasSize = Math.min(canvas.width, canvas.height);
            const cellSize = canvasSize / GAME_CONFIG.boardSize;
            const offset = cellSize / 2;
            
            // 计算相对于Canvas的坐标
            const x = (clientX - rect.left) * (canvas.width / rect.width);
            const y = (clientY - rect.top) * (canvas.height / rect.height);
            
            // 计算最接近的交叉点
            const col = Math.round((x - offset) / cellSize);
            const row = Math.round((y - offset) / cellSize);
            
            return { x, y, row, col, cellSize, offset };
        };
        
        canvas.addEventListener('click', (e) => {
            const pos = calculateBoardPosition(e.clientX, e.clientY);
            
            // 边界检查
            if (pos.row >= 0 && pos.row < GAME_CONFIG.boardSize && pos.col >= 0 && pos.col < GAME_CONFIG.boardSize) {
                console.log('Canvas clicked:', { 
                    clientX: e.clientX, 
                    clientY: e.clientY,
                    ...pos,
                    calculatedX: pos.col * pos.cellSize + pos.offset,
                    calculatedY: pos.row * pos.cellSize + pos.offset
                });
                
                // 临时调试：在点击位置绘制一个标记
                if (GAME_CONFIG.debugMode) {
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // 绘制实际落子位置
                    const actualX = pos.col * pos.cellSize + pos.offset;
                    const actualY = pos.row * pos.cellSize + pos.offset;
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                    ctx.beginPath();
                    ctx.arc(actualX, actualY, 6, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    console.log('Click position vs calculated position:', {
                        clickPos: { x: pos.x, y: pos.y },
                        calculatedPos: { x: actualX, y: actualY },
                        difference: { x: Math.abs(pos.x - actualX), y: Math.abs(pos.y - actualY) }
                    });
                }
                
                this.gameManager.handleCanvasClick(pos.row, pos.col);
            } else {
                console.log('Click outside board area:', { row: pos.row, col: pos.col, boardSize: GAME_CONFIG.boardSize });
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            const pos = calculateBoardPosition(e.clientX, e.clientY);
            
            // 边界检查
            if (pos.row >= 0 && pos.row < GAME_CONFIG.boardSize && pos.col >= 0 && pos.col < GAME_CONFIG.boardSize) {
                if (GAME_CONFIG.debugMode) {
                    console.log('Mouse hover:', { 
                        ...pos,
                        calculatedX: pos.col * pos.cellSize + pos.offset,
                        calculatedY: pos.row * pos.cellSize + pos.offset
                    });
                }
                this.gameManager.handleCanvasHover(pos.row, pos.col);
            } else {
                this.gameManager.clearPreview();
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            this.gameManager.clearPreview();
        });
        
        // 添加鼠标进入棋盘区域的事件
        canvas.addEventListener('mouseenter', () => {
            // 鼠标进入棋盘区域时，如果有预览位置则显示
            if (this.gameManager.gameState.previewPiece) {
                this.gameManager.uiManager.render(this.gameManager.gameState);
            }
        });
        
        // 添加触摸事件支持（移动端）
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const pos = calculateBoardPosition(touch.clientX, touch.clientY);
            
            // 边界检查
            if (pos.row >= 0 && pos.row < GAME_CONFIG.boardSize && pos.col >= 0 && pos.col < GAME_CONFIG.boardSize) {
                this.gameManager.handleCanvasHover(pos.row, pos.col);
            } else {
                this.gameManager.clearPreview();
            }
        });
        
        canvas.addEventListener('touchend', () => {
            this.gameManager.clearPreview();
        });
        
        // 添加窗口大小变化监听器
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
        
        // 添加ESC键取消技能选择
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.gameManager.gameState.skillMode) {
                this.gameManager.cancelSkillSelection();
            }
        });
        
        // 添加右键取消技能选择
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.gameManager.gameState.skillMode) {
                this.gameManager.cancelSkillSelection();
            }
        });
        
        console.log('Canvas initialized successfully');
    }
    
    resizeCanvas() {
        const canvas = document.getElementById('gameBoard');
        if (!canvas) return;
        
        const container = canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        const size = Math.min(containerRect.width, containerRect.height);
        
        // 设置Canvas的实际尺寸和显示尺寸一致
        canvas.width = size;
        canvas.height = size;
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        
        // 确保Canvas的显示属性正确
        canvas.style.display = 'block';
        canvas.style.margin = '0';
        canvas.style.padding = '0';
        
        console.log('Canvas resized to:', size, 'x', size, 'container:', containerRect.width, 'x', containerRect.height);
        
        // 重新绘制
        this.drawBoard(canvas.getContext('2d'));
        
        // 重新渲染游戏状态
        if (this.gameManager && this.gameManager.gameState) {
            this.render(this.gameManager.gameState);
        }
    }
    
    drawBoard(ctx) {
        const canvas = ctx.canvas;
        const canvasSize = Math.min(canvas.width, canvas.height);
        const cellSize = canvasSize / GAME_CONFIG.boardSize;
        const offset = cellSize / 2;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制棋盘基底 - 浅木色（#E8DCCA）
        ctx.fillStyle = '#E8DCCA';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 添加纸张/木纹肌理 - 1%灰度噪点
        this.addTextureNoise(ctx, canvas.width, canvas.height);
        
        // 绘制边框 - 8px深木色（#735A3A）描边，四角圆角8px
        ctx.strokeStyle = '#735A3A';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
        
        // 外沿高光 - 2px浅色（#F0E8D9）
        ctx.strokeStyle = '#F0E8D9';
        ctx.lineWidth = 2;
        ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
        
        // 绘制网格线 - 2px深棕色（#8B6E4E）
        ctx.strokeStyle = '#8B6E4E';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < GAME_CONFIG.boardSize; i++) {
            const pos = i * cellSize + offset;
            
            // 垂直线
            ctx.beginPath();
            ctx.moveTo(pos, offset);
            ctx.lineTo(pos, canvasSize - offset);
            ctx.stroke();
            
            // 水平线
            ctx.beginPath();
            ctx.moveTo(offset, pos);
            ctx.lineTo(canvasSize - offset, pos);
            ctx.stroke();
        }
        
        // 绘制交叉点圆点 - 1px同色系圆点强化落子定位
        ctx.fillStyle = '#8B6E4E';
        for (let i = 0; i < GAME_CONFIG.boardSize; i++) {
            for (let j = 0; j < GAME_CONFIG.boardSize; j++) {
                const x = j * cellSize + offset;
                const y = i * cellSize + offset;
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
        
        // 绘制星位点 - 稍大的圆点
        const starPoints = [3, 7, 11];
        ctx.fillStyle = '#8B6E4E';
        starPoints.forEach(row => {
            starPoints.forEach(col => {
                const x = col * cellSize + offset;
                const y = row * cellSize + offset;
                ctx.beginPath();
                ctx.arc(x, y, Math.max(3, cellSize * 0.08), 0, 2 * Math.PI);
                ctx.fill();
            });
        });
        
        // 调试：绘制网格交点（可选）
        if (GAME_CONFIG.debugMode) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            for (let i = 0; i < GAME_CONFIG.boardSize; i++) {
                for (let j = 0; j < GAME_CONFIG.boardSize; j++) {
                    const x = j * cellSize + offset;
                    const y = i * cellSize + offset;
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // 添加坐标标签
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.font = '10px Arial';
                    ctx.fillText(`${i},${j}`, x + 5, y - 5);
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                }
            }
        }
    }
    
    // 添加纸张/木纹肌理
    addTextureNoise(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            // 添加1%的随机噪点
            const noise = (Math.random() - 0.5) * 2.55; // 1% of 255
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    drawPiece(ctx, row, col, color, isAnimating = false, animationProgress = 1) {
        const canvas = ctx.canvas;
        const canvasSize = Math.min(canvas.width, canvas.height);
        const cellSize = canvasSize / GAME_CONFIG.boardSize;
        const offset = cellSize / 2;
        
        const x = col * cellSize + offset;
        const y = row * cellSize + offset;
        const radius = cellSize * 0.4; // 直径比网格间距小5px (30px - 5px = 25px, 半径12.5px)
        
        ctx.save();
        
        // 落子动效：轻落和弹跳效果
        if (isAnimating) {
            const bounceScale = 1 + 0.05 * Math.sin(animationProgress * Math.PI); // 轻微弹跳
            const dropY = y * animationProgress; // 从上方落下
            ctx.translate(x, dropY);
            ctx.scale(bounceScale, bounceScale);
            ctx.translate(-x, -y);
        }
        
        if (color === 'black') {
            // 黑棋：纯黑色（#1A1A1A）圆形，底部加2px深灰（#333333）内阴影
            ctx.fillStyle = '#1A1A1A';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
            
            // 底部内阴影效果
            ctx.fillStyle = '#333333';
            ctx.beginPath();
            ctx.arc(x + 1, y + 1, radius - 1, 0, 2 * Math.PI);
            ctx.fill();
            
            // 重新绘制主体
            ctx.fillStyle = '#1A1A1A';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
            
            // 左上角高光点（10%区域）
            const highlightRadius = radius * 0.3;
            const highlightX = x - radius * 0.3;
            const highlightY = y - radius * 0.3;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(highlightX, highlightY, highlightRadius, 0, 2 * Math.PI);
            ctx.fill();
            
        } else {
            // 白棋：纯白色（#FFFFFF）圆形，边缘加1px浅灰（#E0E0E0）描边，底部加2px浅灰（#F0F0F0）阴影
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
            
            // 边缘描边
            ctx.strokeStyle = '#E0E0E0';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // 底部阴影效果
            ctx.fillStyle = '#F0F0F0';
            ctx.beginPath();
            ctx.arc(x + 1, y + 1, radius - 1, 0, 2 * Math.PI);
            ctx.fill();
            
            // 重新绘制主体
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fill();
            
            // 重新绘制描边
            ctx.strokeStyle = '#E0E0E0';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // 绘制胜利连子高光效果
    drawVictoryHighlight(ctx, winningPieces) {
        if (!winningPieces || winningPieces.length === 0) return;
        
        const canvas = ctx.canvas;
        const canvasSize = Math.min(canvas.width, canvas.height);
        const cellSize = canvasSize / GAME_CONFIG.boardSize;
        const offset = cellSize / 2;
        
        ctx.save();
        
        // 金色描边闪烁效果
        const time = Date.now() * 0.005; // 时间因子
        const alpha = 0.5 + 0.5 * Math.sin(time); // 0.5-1.0之间闪烁
        
        ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`; // 金色
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        
        winningPieces.forEach(piece => {
            const x = piece.col * cellSize + offset;
            const y = piece.row * cellSize + offset;
            const radius = cellSize * 0.4;
            
            ctx.beginPath();
            ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
            ctx.stroke();
        });
        
        ctx.restore();
    }
    
    drawPreviewPiece(ctx, previewPiece) {
        const canvas = ctx.canvas;
        const canvasSize = Math.min(canvas.width, canvas.height);
        const cellSize = canvasSize / GAME_CONFIG.boardSize;
        const offset = cellSize / 2;
        
        const x = previewPiece.col * cellSize + offset;
        const y = previewPiece.row * cellSize + offset;
        const radius = cellSize * 0.4;
        
        // 确保预览在Canvas范围内
        if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) {
            return;
        }
        
        ctx.save();
        
        switch (previewPiece.type) {
            case 'normal':
                // 普通预览：当前玩家的棋子半透明版（黑棋60%透明度，白棋70%透明度），无阴影
                const currentPlayer = this.gameManager.gameState.currentPlayer;
                if (currentPlayer === 'black') {
                    ctx.fillStyle = 'rgba(26, 26, 26, 0.6)'; // 黑棋60%透明度
                } else {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // 白棋70%透明度
                }
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI);
                ctx.fill();
                
                // 白棋预览添加描边
                if (currentPlayer === 'white') {
                    ctx.strokeStyle = 'rgba(224, 224, 224, 0.7)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                break;
                
            case 'remove':
                // 移除预览：红色X
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x - radius, y - radius);
                ctx.lineTo(x + radius, y + radius);
                ctx.moveTo(x + radius, y - radius);
                ctx.lineTo(x - radius, y + radius);
                ctx.stroke();
                break;
                
            case 'move':
                // 移动预览：蓝色圆圈
                ctx.fillStyle = 'rgba(0, 0, 255, 0.6)';
                ctx.beginPath();
                ctx.arc(x, y, radius * 0.8, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
                
            case 'forbidden':
                // 禁地区域预览：黄色虚线边框
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(x - cellSize * 1.5, y - cellSize * 1.5, cellSize * 3, cellSize * 3);
                ctx.setLineDash([]);
                break;
                
            case 'target':
                // 目标预览：绿色圆圈
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, 2 * Math.PI);
                ctx.stroke();
                break;
        }
        
        ctx.restore();
    }
    
    render(gameState) {
        const canvas = document.getElementById('gameBoard');
        if (!canvas) {
            console.error('Canvas not found during render');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        this.drawBoard(ctx);
        
        for (let i = 0; i < GAME_CONFIG.boardSize; i++) {
            for (let j = 0; j < GAME_CONFIG.boardSize; j++) {
                if (gameState.board[i][j]) {
                    this.drawPiece(ctx, i, j, gameState.board[i][j]);
                }
            }
        }
        
        // 绘制胜利连子高光效果
        if (gameState.winningPieces && gameState.winningPieces.length > 0) {
            this.drawVictoryHighlight(ctx, gameState.winningPieces);
        }
        
        // 绘制预览棋子
        if (gameState.previewPiece) {
            this.drawPreviewPiece(ctx, gameState.previewPiece);
        }
    }
    
    showVictoryModal(winner) {
        const modal = document.getElementById('victoryModal');
        const title = document.getElementById('victoryTitle');
        const message = document.getElementById('victoryMessage');
        
        if (modal && title && message) {
            title.textContent = '恭喜获胜！';
            message.textContent = `${winner === 'black' ? '黑方' : '白方'}玩家获得了胜利！`;
            
            modal.classList.remove('hidden');
            animationManager.showVictoryAnimation(winner);
        }
    }
    
    
    clearSkillUsageTip() {
        const tip = document.getElementById('skillUsageTip');
        if (tip) {
            tip.classList.add('hidden');
        }
    }
    
    closeVictoryModal() {
        const modal = document.getElementById('victoryModal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    showSkillTooltip(event, skill) {
        // 立即移除现有的提示框
        const existingTooltip = document.getElementById('skill-tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        // 创建提示框元素
        const tooltip = document.createElement('div');
        tooltip.id = 'skill-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
            color: #ffffff;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2);
            z-index: 1000;
            max-width: 300px;
            font-size: 14px;
            line-height: 1.5;
            pointer-events: none;
            border: 2px solid #d4af37;
            backdrop-filter: blur(10px);
        `;
        
        // 设置提示框内容
        tooltip.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 12px; color: #d4af37; font-size: 18px; text-align: center; border-bottom: 1px solid #4a5568; padding-bottom: 8px;">
                ${skill.emoji} ${skill.name}
            </div>
            <div style="margin-bottom: 12px; color: #e2e8f0; text-align: center; font-size: 15px;">
                ${skill.description}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #a0aec0; background: rgba(212, 175, 55, 0.1); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(212, 175, 55, 0.3);">
                <span style="display: flex; align-items: center; gap: 4px;">⚡ ${skill.cost}</span>
                <span style="display: flex; align-items: center; gap: 4px;">⏱️ ${skill.cooldown}回合</span>
            </div>
        `;
        
        // 为提示框添加鼠标事件
        tooltip.addEventListener('mouseenter', () => {
            this.isMouseOverTooltip = true;
            // 鼠标进入提示框时，清除隐藏定时器
            const skillButtons = document.querySelectorAll('.skill-button');
            skillButtons.forEach(btn => {
                const timeout = btn.tooltipTimeout;
                if (timeout) {
                    clearTimeout(timeout);
                    btn.tooltipTimeout = null;
                }
            });
        });
        
        tooltip.addEventListener('mouseleave', () => {
            this.isMouseOverTooltip = false;
            // 鼠标离开提示框时，延迟隐藏
            setTimeout(() => {
                if (!this.isMouseOverButton && !this.isMouseOverTooltip) {
                    this.hideSkillTooltip();
                }
            }, 100);
        });
        
        // 添加到页面
        document.body.appendChild(tooltip);
        
        // 计算位置
        const rect = event.target.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        let top = rect.top - tooltipRect.height - 10;
        
        // 边界检查
        if (left < 10) left = 10;
        if (left + tooltipRect.width > viewportWidth - 10) {
            left = viewportWidth - tooltipRect.width - 10;
        }
        
        // 如果上方空间不够，显示在下方
        if (top < 10) {
            top = rect.bottom + 10;
        }
        
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
        
        // 添加淡入动画
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateY(10px)';
        tooltip.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        
        requestAnimationFrame(() => {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateY(0)';
        });
    }
    
    hideSkillTooltip() {
        const tooltip = document.getElementById('skill-tooltip');
        if (tooltip) {
            // 立即开始淡出动画
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateY(10px)';
            tooltip.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
            
            // 确保在动画完成后移除元素
            setTimeout(() => {
                if (tooltip && tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                }
            }, 150);
        }
    }
}

// 游戏管理器类
class GameManager {
    constructor() {
        this.gameState = new GameState();
        this.skillSystem = new SkillSystem();
        this.uiManager = new UIManager(this);
        this.animationManager = new AnimationManager();
        this.selectedSkill = null;
        
        // 添加渲染防抖
        this.renderTimeout = null;
        
        this.startNewGame();
    }
    
    startNewGame() {
        console.log('Starting new game...');
        
        // 如果还没有选择技能池，先显示技能选择界面
        if (this.gameState.gamePhase === 'skillSelection') {
            this.uiManager.showSkillSelection();
            return;
        }
        
        // 重置游戏状态而不是创建新实例
        this.gameState.board = this.gameState.createBoard();
        this.gameState.currentPlayer = 'black';
        this.gameState.gamePhase = 'playing';
        // 使用统一状态管理器重置状态
        this.gameState.stateManager.reset();
        this.gameState.history = [];
        this.gameState.winner = null;
        this.gameState.gameStatus = 'playing';
        this.gameState.selectedSkill = null;
        this.gameState.skillMode = false;
        this.gameState.protectedPieces = { black: new Set(), white: new Set() };
        this.gameState.forbiddenAreas = [];
        this.gameState.skipNextTurn = null;
        this.gameState.protectionDuration = 0;
        this.gameState.freezeDuration = null;
        this.gameState.previewPiece = null;
        
        this.selectedSkill = null;
        this.uiManager.render(this.gameState);
        this.uiManager.updateGameStatus();
        console.log('New game started successfully');
    }
    
    startGameWithSkillPools() {
        console.log('Starting game with skill pools...');
        
        // 设置游戏阶段为playing
        this.gameState.gamePhase = 'playing';
        
        // 重置游戏状态
        this.gameState.board = this.gameState.createBoard();
        this.gameState.currentPlayer = 'black';
        this.gameState.stateManager.reset();
        this.gameState.history = [];
        this.gameState.winner = null;
        this.gameState.gameStatus = 'playing';
        this.gameState.selectedSkill = null;
        this.gameState.skillMode = false;
        this.gameState.protectedPieces = { black: new Set(), white: new Set() };
        this.gameState.forbiddenAreas = [];
        this.gameState.skipNextTurn = null;
        this.gameState.protectionDuration = 0;
        this.gameState.freezeDuration = null;
        this.gameState.previewPiece = null;
        
        this.selectedSkill = null;
        
        // 更新玩家名称显示
        this.updatePlayerNames();
        
        // 更新UI
        this.uiManager.createSkillButtons();
        this.uiManager.render(this.gameState);
        this.uiManager.updateGameStatus();
        this.uiManager.updateSkillStatus();
        
        console.log('Game started with skill pools successfully');
    }
    
    updatePlayerNames() {
        // 更新左侧玩家信息
        const blackPlayerInfo = document.getElementById('blackPlayerInfo');
        if (blackPlayerInfo) {
            const h3 = blackPlayerInfo.querySelector('h3');
            if (h3) {
                h3.textContent = this.gameState.playerNames.black;
            }
        }
        
        // 更新右侧玩家信息
        const whitePlayerInfo = document.getElementById('whitePlayerInfo');
        if (whitePlayerInfo) {
            const h3 = whitePlayerInfo.querySelector('h3');
            if (h3) {
                h3.textContent = this.gameState.playerNames.white;
            }
        }
    }
    
    async handleCanvasClick(row, col) {
        if (this.gameState.gameStatus !== 'playing') return;
        
        if (this.gameState.skillMode && this.selectedSkill) {
            // 在技能模式下，先验证目标是否有效
            const target = { row, col };
            if (this.skillSystem.isValidTarget(this.gameState, this.selectedSkill, target)) {
                await this.useSkill(row, col);
            } else {
                console.log('Invalid target for skill:', this.selectedSkill, target);
            }
            // 目标无效时，不执行任何操作，静默忽略
        } else {
            await this.makeMove(row, col);
        }
    }
    
    handleCanvasHover(row, col) {
        if (this.gameState.gameStatus !== 'playing') {
            this.clearPreview();
            return;
        }
        
        // 检查位置是否有效
        if (row < 0 || row >= GAME_CONFIG.boardSize || col < 0 || col >= GAME_CONFIG.boardSize) {
            this.clearPreview();
            return;
        }
        
        if (this.gameState.skillMode) {
            // 技能模式下的预览逻辑
            if (this.selectedSkill) {
                const skill = SKILLS[this.selectedSkill];
                if (skill) {
                    // 根据技能类型显示不同的预览效果
                    switch (this.selectedSkill) {
                        case 'feishazoushi':
                            // 飞沙走石：显示可以移除的棋子
                            if (this.gameState.board[row][col] && 
                                this.gameState.board[row][col] !== this.gameState.currentPlayer) {
                                this.gameState.previewPiece = { row, col, type: 'remove' };
        } else {
                                this.clearPreview();
                            }
                            break;
                        case 'yihuajiemu':
                            // 移花接木：显示可以移动的棋子
                            if (this.gameState.board[row][col] === this.gameState.currentPlayer) {
                                this.gameState.previewPiece = { row, col, type: 'move' };
                            } else {
                                this.clearPreview();
                            }
                            break;
                        case 'huadweiliao':
                            // 擒擒拿拿：显示禁地区域
                            this.gameState.previewPiece = { row, col, type: 'forbidden' };
                            break;
                        default:
                            // 其他技能：显示目标位置
                            this.gameState.previewPiece = { row, col, type: 'target' };
                    }
                }
            }
        } else {
            // 普通模式下的预览逻辑
            if (this.isValidMove(row, col)) {
                this.gameState.previewPiece = { row, col, type: 'normal' };
            } else {
                this.clearPreview();
            }
        }
        
        // 使用防抖渲染，确保响应迅速但不频繁重绘
        this.debouncedRender();
    }
    
    clearPreview() {
        if (this.gameState.previewPiece) {
        this.gameState.previewPiece = null;
        this.uiManager.render(this.gameState);
        }
    }
    
    debouncedRender() {
        // 清除之前的渲染请求
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        
        // 立即渲染预览，延迟渲染其他内容
        this.uiManager.render(this.gameState);
        
        // 如果需要，可以在这里添加额外的渲染优化
        this.renderTimeout = setTimeout(() => {
            // 这里可以添加额外的渲染逻辑
        }, 16); // 约60fps
    }
    
    isValidMove(row, col) {
        if (row < 0 || row >= GAME_CONFIG.boardSize || col < 0 || col >= GAME_CONFIG.boardSize) {
            return false;
        }
        
        if (this.gameState.board[row][col] !== null) {
            return false;
        }
        
        for (let area of this.gameState.forbiddenAreas) {
            if (Math.abs(row - area.centerRow) <= 1 && Math.abs(col - area.centerCol) <= 1) {
                return false;
            }
        }
        
        return true;
    }
    
    async makeMove(row, col) {
        try {
            const result = await this.gameState.executeTurn(OPERATION_TYPES.PLACE, { row, col });
            
            if (result.success) {
                // 检查游戏是否结束 - 使用落子的玩家（当前回合的玩家）
                const movePlayer = this.gameState.currentPlayer === 'black' ? 'white' : 'black';
                if (VictoryChecker.checkWin(this.gameState.board, row, col, movePlayer)) {
                    this.gameState.gameStatus = 'victory';
                    this.gameState.winner = movePlayer;
                    this.uiManager.showVictoryModal(movePlayer);
                } else {
                    this.uiManager.render(this.gameState);
                    this.uiManager.updateGameStatus();
                }
                return true;
            } else {
                console.error('Move failed:', result.error);
                return false;
            }
        } catch (error) {
            console.error('Move execution error:', error);
            return false;
        }
    }
    
    selectSkill(skillId) {
        console.log('Selecting skill:', skillId);
        const skill = SKILLS[skillId];
        if (!skill) {
            console.error('Skill not found:', skillId);
            return;
        }
        
        // 如果已经在技能模式，先取消当前技能
        if (this.gameState.skillMode) {
            this.cancelSkillSelection();
        }
        
        if (!this.skillSystem.canUseSkill(this.gameState, this.gameState.currentPlayer, skillId)) {
            console.log('Cannot use skill:', skillId, 'not available');
            return;
        }
        
        // 检查技能是否需要目标位置
        const needsTarget = ['feishazoushi', 'shiguangdaoliu', 'yihuajiemu', 'huadweiliao'].includes(skillId);
        const immediateSkills = ['shiguangdongjie', 'guruojintang', 'libashanxi', 'fudichouxin', 'baojieshangmen'];
        
        if (needsTarget) {
            // 需要目标位置的技能，激活技能模式
            this.selectedSkill = skillId;
            this.gameState.selectedSkill = skillId;
            this.gameState.skillMode = true;
            this.uiManager.updateGameStatus();
        } else if (immediateSkills.includes(skillId)) {
            // 立即生效的技能，直接使用
            this.useSkillDirectly(skillId);
        } else {
            // 其他技能，激活技能模式
            this.selectedSkill = skillId;
            this.gameState.selectedSkill = skillId;
            this.gameState.skillMode = true;
            this.uiManager.updateGameStatus();
        }
        
        console.log('Skill selected successfully:', skill.name);
    }
    
    cancelSkillSelection() {
        this.selectedSkill = null;
        this.gameState.selectedSkill = null;
        this.gameState.skillMode = false;
        this.clearSkillUsageTip();
        this.uiManager.updateGameStatus();
        console.log('Skill selection cancelled');
    }
    
    async useSkillDirectly(skillId) {
        console.log('Using skill directly:', skillId);
        
        try {
            const result = await this.gameState.executeTurn(OPERATION_TYPES.SKILL, { 
                skillId: skillId, 
                target: {} 
            });
            
            if (result.success) {
                // 播放技能动画
                if (skillId !== 'libashanxi' && skillId !== 'shiguangdaoliu') {
                    animationManager.playSkillEffect(skillId, {});
                }
                
                // 检查游戏是否结束
                if (this.gameState.checkGameEnd()) {
                    this.uiManager.showVictoryModal(this.gameState.currentPlayer);
                }
                
                this.uiManager.render(this.gameState);
                this.uiManager.updateGameStatus();
                return true;
            } else {
                console.log('Skill use failed:', result.error);
                this.showSkillFailureTip(skillId, 0, 0);
                return false;
            }
        } catch (error) {
            console.error('Skill execution error:', error);
            this.showSkillFailureTip(skillId, 0, 0);
            return false;
        }
    }
    
    activateSkill(skillId) {
        this.selectedSkill = skillId;
        this.gameState.skillMode = true;
        this.uiManager.updateGameStatus();
    }
    
    async useSkill(targetRow, targetCol) {
        console.log('Using skill:', this.selectedSkill, 'at position:', targetRow, targetCol);
        
        if (!this.selectedSkill) {
            console.log('No skill selected');
            return false;
        }
        
        let target = { row: targetRow, col: targetCol };
        
        // 根据不同技能类型处理目标参数
        switch (this.selectedSkill) {
            case 'feishazoushi':
            case 'shiguangdaoliu':
                // 这些技能只需要目标位置
                break;
                
            case 'shiguangdongjie':
            case 'guruojintang':
            case 'libashanxi':
            case 'fudichouxin':
            case 'baojieshangmen':
                // 这些技能不需要目标位置，直接使用
                target = {};
                break;
                
            case 'yihuajiemu':
                // 移花接木需要源位置和目标位置，这里简化处理
                // 在实际游戏中应该让玩家选择源棋子
                const sourcePiece = this.findNearbySourcePiece(targetRow, targetCol);
                if (sourcePiece) {
                    target = {
                        fromRow: sourcePiece.row,
                        fromCol: sourcePiece.col,
                        toRow: targetRow,
                        toCol: targetCol
                    };
                }
                break;
                
            case 'huadweiliao':
                // 擒擒拿拿需要中心位置
                target = { centerRow: targetRow, centerCol: targetCol };
                break;
                
            default:
                // 其他技能不需要目标参数
                target = {};
        }
        
        try {
            const result = await this.gameState.executeTurn(OPERATION_TYPES.SKILL, { 
                skillId: this.selectedSkill, 
                target: target 
            });
            
            console.log('Skill use result:', result.success);
            
            if (result.success) {
            // 播放技能动画
            if (this.selectedSkill !== 'libashanxi' && this.selectedSkill !== 'shiguangdaoliu') {
                animationManager.playSkillEffect(this.selectedSkill, target);
            }
            
                // 清除技能提示
                this.clearSkillUsageTip();
                
                // 重置技能状态
            this.selectedSkill = null;
            this.gameState.skillMode = false;
            
                if (this.gameState.checkGameEnd()) {
                    this.uiManager.showVictoryModal(this.gameState.currentPlayer);
                }
            
            this.uiManager.render(this.gameState);
            this.uiManager.updateGameStatus();
                return true;
            } else {
                console.log('Skill use failed:', result.error);
                this.showSkillFailureTip(this.selectedSkill, targetRow, targetCol);
                this.selectedSkill = null;
                this.gameState.skillMode = false;
            this.clearSkillUsageTip();
                this.uiManager.updateGameStatus();
                return false;
            }
        } catch (error) {
            console.error('Skill execution error:', error);
            this.showSkillFailureTip(this.selectedSkill, targetRow, targetCol);
            this.selectedSkill = null;
            this.gameState.skillMode = false;
            this.clearSkillUsageTip();
            this.uiManager.updateGameStatus();
            return false;
        }
    }
    
    findNearbySourcePiece(targetRow, targetCol) {
        const directions = [[-1,0], [1,0], [0,-1], [0,1]];
        const player = this.gameState.currentPlayer;
        
        // 首先查找相邻的我方棋子
        for (let [dr, dc] of directions) {
            const sourceRow = targetRow + dr;
            const sourceCol = targetCol + dc;
            
            if (VictoryChecker.isValidPosition(sourceRow, sourceCol) && 
                this.gameState.board[sourceRow][sourceCol] === player) {
                return { row: sourceRow, col: sourceCol };
            }
        }
        
        // 如果相邻没有，查找2格范围内的我方棋子
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (dr === 0 && dc === 0) continue;
                if (Math.abs(dr) + Math.abs(dc) > 2) continue;
                
                const sourceRow = targetRow + dr;
                const sourceCol = targetCol + dc;
                
                if (VictoryChecker.isValidPosition(sourceRow, sourceCol) && 
                    this.gameState.board[sourceRow][sourceCol] === player) {
                    return { row: sourceRow, col: sourceCol };
                }
            }
        }
        
        return null;
    }
    
    showSkillUsageTip(skill) {
        console.log('Showing skill usage tip for:', skill.name);
        
        // 先清除现有的提示
        this.clearSkillUsageTip();
        
        // 检查是否已经有提示在显示
        if (document.getElementById('skillUsageTip')) {
            return;
        }
        
        // 创建技能使用提示
        const tip = document.createElement('div');
        tip.id = 'skillUsageTip';
        tip.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        tip.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #2d5016;
            color: white;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            z-index: 1000;
        `;
        tip.innerHTML = `
            <div style="text-align: center;">
                <div style="font-weight: bold; margin-bottom: 4px;">${skill.name}</div>
                <div style="font-size: 14px; margin-bottom: 4px;">${skill.description}</div>
                <div style="font-size: 12px;">点击棋盘上的目标位置使用技能</div>
            </div>
        `;
        document.body.appendChild(tip);
        
        // 3秒后自动消失
        setTimeout(() => {
            this.clearSkillUsageTip();
        }, 3000);
    }
    
    clearSkillUsageTip() {
        const tip = document.getElementById('skillUsageTip');
        if (tip) {
            console.log('Clearing skill usage tip');
            tip.classList.add('hidden');
        }
    }
    
    showSkillFailureTip(skillId, targetRow, targetCol) {
        // 先清除现有提示
        this.clearSkillUsageTip();
        
        // 创建失败提示
        const tip = document.createElement('div');
        tip.id = 'skillFailureTip';
        tip.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        tip.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #b22222;
            color: white;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            z-index: 1000;
        `;
        // 根据技能类型显示具体的失败原因
        let failureMessage = '技能使用失败！';
        let detailMessage = '无法在此位置使用技能';
        
        if (skillId) {
            const skill = SKILLS[skillId];
            if (skill) {
                switch (skillId) {
                    case 'feishazoushi':
                        failureMessage = '飞沙走石失败';
                        detailMessage = '目标位置没有对手棋子或棋子被保护';
                        break;
                    case 'yihuajiemu':
                        failureMessage = '移花接木失败';
                        detailMessage = '附近没有我方棋子可移动';
                        break;
                    case 'huadweiliao':
                        failureMessage = '擒擒拿拿失败';
                        detailMessage = '目标位置太靠近边缘，无法创建3x3区域';
                        break;
                    case 'shiguangdaoliu':
                        failureMessage = '拾金不昧失败';
                        detailMessage = '没有可撤销的落子操作';
                        break;
                    case 'fudichouxin':
                        failureMessage = '釜底抽薪失败';
                        detailMessage = '对手最近没有放置足够的棋子';
                        break;
                    case 'baojieshangmen':
                        failureMessage = '保洁上门失败';
                        detailMessage = '对手没有可移除的棋子';
                        break;
                    default:
                        failureMessage = `${skill.name}失败`;
                        detailMessage = '无法在此位置使用技能';
                }
            }
        }
        
        tip.innerHTML = `
            <div style="text-align: center;">
                <div style="font-weight: bold; margin-bottom: 4px;">${failureMessage}</div>
                <div style="font-size: 14px;">${detailMessage}</div>
            </div>
        `;
        document.body.appendChild(tip);
        
        // 2秒后自动消失
        setTimeout(() => {
            this.clearSkillFailureTip();
        }, 2000);
    }
    
    clearSkillFailureTip() {
        const tip = document.getElementById('skillFailureTip');
        if (tip) {
            tip.remove();
        }
    }
    
    nextTurn() {
        // 使用统一状态管理器处理状态更新
        this.gameState.stateManager.updateCooldowns();
        this.gameState.stateManager.regenEnergy(this.gameState.currentPlayer);
        this.gameState.stateManager.turnCount++;
        
        const currentPlayer = this.gameState.currentPlayer;
        
        // 检查是否有玩家需要跳过回合
        if (this.gameState.skipNextTurn) {
            console.log('Skip next turn for:', this.gameState.skipNextTurn, 'Current player:', currentPlayer);
            // 先切换到下一个玩家
            this.gameState.currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
            console.log('Switched to:', this.gameState.currentPlayer);
            
            // 检查新切换到的玩家是否应该被跳过
            if (this.gameState.skipNextTurn === this.gameState.currentPlayer) {
                console.log('Player', this.gameState.currentPlayer, 'is frozen, skipping turn');
                // 当前玩家被冻结，跳过回合，再次切换
                this.gameState.skipNextTurn = null;
                if (this.gameState.freezeDuration) {
                    this.gameState.freezeDuration--;
                    if (this.gameState.freezeDuration <= 0) {
                        this.gameState.freezeDuration = null;
                    }
                }
                // 再次切换到对手
                this.gameState.currentPlayer = this.gameState.currentPlayer === 'black' ? 'white' : 'black';
                console.log('Final player:', this.gameState.currentPlayer);
            }
        } else {
            // 正常切换玩家
            this.gameState.currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        }
        
        // 只有在非技能模式下才重置技能状态
        if (!this.gameState.skillMode) {
            this.selectedSkill = null;
            this.gameState.skillMode = false;
        }
        
        // 更新技能显示（切换技能池）
        this.uiManager.createSkillButtons();
        this.uiManager.updateSkillStatus();
    }
    
    checkGameEnd() {
        const currentPlayer = this.gameState.currentPlayer;
        let canMove = false;
        
        for (let i = 0; i < GAME_CONFIG.boardSize; i++) {
            for (let j = 0; j < GAME_CONFIG.boardSize; j++) {
                if (this.isValidMove(i, j)) {
                    canMove = true;
                    break;
                }
            }
            if (canMove) break;
        }
        
        if (!canMove) {
            this.gameState.gameStatus = 'victory';
            this.gameState.winner = currentPlayer === 'black' ? 'white' : 'black';
            return true;
        }
        
        return false;
    }
    
    restartGame() {
        // 重置技能池选择
        this.gameState.gamePhase = 'skillSelection';
        this.gameState.playerSkillPools = { black: [], white: [] };
        this.gameState.playerNames = { black: '黑方玩家', white: '白方玩家' };
        
        this.startNewGame();
        this.uiManager.closeVictoryModal();
    }
    
    undoMove() {
        if (this.gameState.history.length === 0) return;
        
        const lastMove = this.gameState.history.pop();
        if (lastMove.type === 'move') {
            this.gameState.board[lastMove.row][lastMove.col] = null;
            this.gameState.currentPlayer = lastMove.player;
        }
        
        this.uiManager.render(this.gameState);
        this.uiManager.updateGameStatus();
    }
    
    closeVictoryModal() {
        this.uiManager.closeVictoryModal();
    }
    
    closeSkillModal() {
        this.uiManager.clearSkillUsageTip();
        this.selectedSkill = null;
        this.gameState.skillMode = false;
        this.uiManager.updateGameStatus();
    }
}

// 背景粒子效果
function initBackgroundEffect() {
    const sketch = (p) => {
        let particles = [];
        
        p.setup = () => {
            const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
            if (document.getElementById('backgroundPattern')) {
                canvas.parent('backgroundPattern');
            }
            
            for (let i = 0; i < 30; i++) {
                particles.push({
                    x: p.random(p.width),
                    y: p.random(p.height),
                    vx: p.random(-0.3, 0.3),
                    vy: p.random(-0.3, 0.3),
                    size: p.random(2, 6),
                    opacity: p.random(0.05, 0.15)
                });
            }
        };
        
        p.draw = () => {
            p.clear();
            
            particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                if (particle.x < 0 || particle.x > p.width) particle.vx *= -1;
                if (particle.y < 0 || particle.y > p.height) particle.vy *= -1;
                
                p.fill(212, 175, 55, particle.opacity * 255);
                p.noStroke();
                p.ellipse(particle.x, particle.y, particle.size);
            });
        };
        
        p.windowResized = () => {
            p.resizeCanvas(p.windowWidth, p.windowHeight);
        };
    };
    
    new p5(sketch);
}

// 全局变量
let gameManager;
let animationManager;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    
    // 延迟初始化以确保所有DOM元素都已加载
    setTimeout(() => {
        try {
            console.log('Creating animation manager...');
        animationManager = new AnimationManager();
            
            console.log('Creating game manager...');
        gameManager = new GameManager();
            
            console.log('Initializing background effect...');
        initBackgroundEffect();
        
        // 更新全局gameManager引用
        window.gameManager = {
            restartGame: () => gameManager.restartGame(),
            undoMove: () => gameManager.undoMove(),
            closeVictoryModal: () => gameManager.closeVictoryModal(),
            nextTurn: () => gameManager.nextTurn(),
            gameState: gameManager.gameState,
            skillSystem: gameManager.skillSystem,
            uiManager: gameManager.uiManager,
            selectSkill: (skillId) => gameManager.selectSkill(skillId),
            useSkill: (skillId, target) => gameManager.useSkill(skillId, target)
        };
            
            // 添加调试模式切换函数
            window.toggleDebugMode = () => {
                GAME_CONFIG.debugMode = !GAME_CONFIG.debugMode;
                console.log('Debug mode:', GAME_CONFIG.debugMode ? 'ON' : 'OFF');
                
                // 重新绘制棋盘以显示/隐藏调试信息
                if (gameManager && gameManager.uiManager) {
                    const canvas = document.getElementById('gameBoard');
                    if (canvas) {
                        gameManager.uiManager.drawBoard(canvas.getContext('2d'));
                        if (gameManager.gameState) {
                            gameManager.uiManager.render(gameManager.gameState);
                        }
                    }
                }
            };
            
            console.log('Game initialization completed successfully');
        } catch (error) {
            console.error('Error during game initialization:', error);
        }
    }, 100);
});

// 欢迎页面过渡效果
function initWelcomeTransition() {
    const welcomeTransition = document.getElementById('welcomeTransition');
    const line1 = document.getElementById('welcomeLine1');
    const line2 = document.getElementById('welcomeLine2');
    
    if (!welcomeTransition || !line1 || !line2) {
        console.log('Welcome transition elements not found, skipping...');
        return;
    }
    
    // 检查是否从欢迎页面跳转而来
    const fromWelcome = sessionStorage.getItem('fromWelcome');
    if (!fromWelcome) {
        // 如果没有从欢迎页面跳转，直接隐藏过渡效果
        welcomeTransition.style.display = 'none';
        return;
    }
    
    // 清除标记
    sessionStorage.removeItem('fromWelcome');
    
    // 播放文字浮现动画
    setTimeout(() => {
        line1.classList.add('visible');
    }, 300);
    
    setTimeout(() => {
        line2.classList.add('visible');
    }, 800);
    
    // 3秒后开始淡出
    setTimeout(() => {
        welcomeTransition.classList.add('fade-out');
        
        // 淡出完成后移除元素
        setTimeout(() => {
            welcomeTransition.remove();
        }, 800);
    }, 3000);
}

// 页面加载完成后初始化欢迎过渡
document.addEventListener('DOMContentLoaded', () => {
    initWelcomeTransition();
});