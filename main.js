// 五子棋技能系统 - 主要游戏逻辑

// 游戏配置
const GAME_CONFIG = {
    boardSize: 15,
    maxEnergy: 5,
    initialEnergy: 3,
    energyRegenPerTurn: 1
};

// 技能定义
const SKILLS = {
    feishazoushi: {
        id: 'feishazoushi',
        name: '飞沙走石',
        description: '移除对手场上任意一颗棋子',
        cost: 2,
        cooldown: 3,
        type: 'attack',
        icon: 'resources/skills/feishazoushi.png'
    },
    shiguangdongjie: {
        id: 'shiguangdongjie',
        name: '时光冻结',
        description: '使对手跳过下一回合',
        cost: 2,
        cooldown: 4,
        type: 'control',
        icon: 'resources/skills/shiguangdongjie.png'
    },
    guruojintang: {
        id: 'guruojintang',
        name: '固若金汤',
        description: '使我方已存在的棋子2回合内不可被移除',
        cost: 1,
        cooldown: 3,
        type: 'defense',
        icon: 'resources/skills/guruojintang.png'
    },
    yihuajiemu: {
        id: 'yihuajiemu',
        name: '移花接木',
        description: '将我方一颗棋子移动到相邻空位',
        cost: 1,
        cooldown: 2,
        type: 'special',
        icon: 'resources/skills/yihuajiemu.png'
    },
    shiguangdaoliu: {
        id: 'shiguangdaoliu',
        name: '时光倒流',
        description: '撤销对手上一步的落子操作',
        cost: 3,
        cooldown: 5,
        type: 'special',
        icon: 'resources/skills/shiguangdaoliu.png'
    },
    libashanxi: {
        id: 'libashanxi',
        name: '力拔山兮',
        description: '随机打乱场上所有棋子位置',
        cost: 4,
        cooldown: 7,
        type: 'chaos',
        icon: 'resources/skills/libashanxi.png'
    },
    huadweiliao: {
        id: 'huadweiliao',
        name: '画地为牢',
        description: '指定一个3x3区域，对手2回合内不能在区域内落子',
        cost: 2,
        cooldown: 4,
        type: 'control',
        icon: 'resources/skills/huadweiliao.png'
    },
    fudichouxin: {
        id: 'fudichouxin',
        name: '釜底抽薪',
        description: '移除对手最近放置的3颗棋子',
        cost: 3,
        cooldown: 5,
        type: 'attack',
        icon: 'resources/skills/fudichouxin.png'
    }
};

// 游戏状态管理类
class GameState {
    constructor() {
        this.board = this.createBoard();
        this.currentPlayer = 'black';
        this.energy = { black: GAME_CONFIG.initialEnergy, white: GAME_CONFIG.initialEnergy };
        this.cooldowns = { black: {}, white: {} };
        this.history = [];
        this.winner = null;
        this.gameStatus = 'playing';
        this.selectedSkill = null;
        this.skillMode = false;
        this.protectedPieces = { black: new Set(), white: new Set() };
        this.forbiddenAreas = [];
        this.skipNextTurn = null;
        this.protectionDuration = 0;
        this.previewPiece = null;
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
                if (this.isValidPosition(newRow, newCol) && board[newRow][newCol] === player) {
                    count++;
                } else {
                    break;
                }
            }
            
            // 反向检查
            for (let i = 1; i < 5; i++) {
                const newRow = row - dr * i;
                const newCol = col - dc * i;
                if (this.isValidPosition(newRow, newCol) && board[newRow][newCol] === player) {
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
        
        const playerCooldowns = gameState.cooldowns[player];
        const isOnCooldown = playerCooldowns[skillId] && playerCooldowns[skillId] > 0;
        const hasEnoughEnergy = gameState.energy[player] >= skill.cost;
        
        return !isOnCooldown && hasEnoughEnergy;
    }
    
    useSkill(gameState, player, skillId, target) {
        const skill = this.skills[skillId];
        if (!this.canUseSkill(gameState, player, skillId)) {
            return false;
        }
        
        // 扣除能量
        gameState.energy[player] -= skill.cost;
        
        // 设置冷却
        gameState.cooldowns[player][skillId] = skill.cooldown;
        
        // 执行技能效果
        const success = this.executeSkillEffect(gameState, skillId, target);
        
        if (success) {
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
        
        if (!skillList || !skillListMobile) return;
        
        Object.values(SKILLS).forEach(skill => {
            // 桌面端技能按钮
            const button = this.createSkillButton(skill);
            skillList.appendChild(button);
            
            // 移动端技能按钮
            const mobileButton = this.createSkillButton(skill, true);
            skillListMobile.appendChild(mobileButton);
        });
    }
    
    createSkillButton(skill, isMobile = false) {
        const button = document.createElement('div');
        button.className = `skill-button ${isMobile ? 'mobile' : ''}`;
        button.id = `skill-${skill.id}${isMobile ? '-mobile' : ''}`;
        button.innerHTML = `
            <div class="skill-content">
                <div class="flex items-center justify-center mb-2">
                    <img src="${skill.icon}" alt="${skill.name}" class="w-8 h-8 object-contain" onerror="this.style.display='none'">
                </div>
                <div class="skill-name skill-font text-sm font-bold">${skill.name}</div>
                <div class="skill-cost text-xs">消耗: ${skill.cost}⚡</div>
                <div class="skill-cooldown text-xs" id="cooldown-${skill.id}"></div>
            </div>
        `;
        
        button.addEventListener('click', () => {
            this.gameManager.selectSkill(skill.id);
        });
        
        return button;
    }
    
    updateGameStatus() {
        const gameState = this.gameManager.gameState;
        const statusElement = document.getElementById('gameStatus');
        
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
        
        Object.values(SKILLS).forEach(skill => {
            const desktopButton = document.getElementById(`skill-${skill.id}`);
            const mobileButton = document.getElementById(`skill-${skill.id}-mobile`);
            const cooldownElement = document.getElementById(`cooldown-${skill.id}`);
            
            const buttons = [desktopButton, mobileButton].filter(btn => btn !== null);
            const canUse = this.canUseSkill(gameState, currentPlayer, skill);
            
            buttons.forEach(button => {
                if (!button) return;
                
                if (canUse) {
                    button.classList.remove('disabled', 'on-cooldown');
                } else {
                    button.classList.add('disabled');
                    
                    const cooldown = gameState.cooldowns[currentPlayer][skill.id] || 0;
                    if (cooldown > 0) {
                        button.classList.add('on-cooldown');
                    }
                }
            });
            
            if (cooldownElement) {
                if (canUse) {
                    cooldownElement.textContent = '';
                } else {
                    const cooldown = gameState.cooldowns[currentPlayer][skill.id] || 0;
                    if (cooldown > 0) {
                        cooldownElement.textContent = `冷却: ${cooldown}回合`;
                    } else if (gameState.energy[currentPlayer] < skill.cost) {
                        cooldownElement.textContent = '能量不足';
                    }
                }
            }
        });
    }
    
    canUseSkill(gameState, player, skill) {
        const playerCooldowns = gameState.cooldowns[player];
        const isOnCooldown = playerCooldowns[skill.id] && playerCooldowns[skill.id] > 0;
        const hasEnoughEnergy = gameState.energy[player] >= skill.cost;
        
        return !isOnCooldown && hasEnoughEnergy;
    }
    
    initializeCanvas() {
        const canvas = document.getElementById('gameBoard');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        this.drawBoard(ctx);
        
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const col = Math.floor(x / 30);
            const row = Math.floor(y / 30);
            
            this.gameManager.handleCanvasClick(row, col);
        });
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const col = Math.floor(x / 30);
            const row = Math.floor(y / 30);
            
            this.gameManager.handleCanvasHover(row, col);
        });
        
        canvas.addEventListener('mouseleave', () => {
            this.gameManager.clearPreview();
        });
    }
    
    drawBoard(ctx) {
        ctx.clearRect(0, 0, 450, 450);
        
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(0, 0, 450, 450);
        
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < GAME_CONFIG.boardSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 30 + 15, 15);
            ctx.lineTo(i * 30 + 15, 435);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(15, i * 30 + 15);
            ctx.lineTo(435, i * 30 + 15);
            ctx.stroke();
        }
        
        const starPoints = [3, 7, 11];
        ctx.fillStyle = '#1a1a1a';
        starPoints.forEach(row => {
            starPoints.forEach(col => {
                ctx.beginPath();
                ctx.arc(col * 30 + 15, row * 30 + 15, 3, 0, 2 * Math.PI);
                ctx.fill();
            });
        });
    }
    
    drawPiece(ctx, row, col, color) {
        const x = col * 30 + 15;
        const y = row * 30 + 15;
        
        if (color === 'black') {
            ctx.fillStyle = '#000000';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        } else {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1;
            ctx.shadowColor = 'rgba(0,0,0,0.3)';
            ctx.shadowBlur = 2;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
        }
        
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        if (color === 'white') {
            ctx.stroke();
        }
        
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
    
    render(gameState) {
        const canvas = document.getElementById('gameBoard');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        this.drawBoard(ctx);
        
        for (let i = 0; i < GAME_CONFIG.boardSize; i++) {
            for (let j = 0; j < GAME_CONFIG.boardSize; j++) {
                if (gameState.board[i][j]) {
                    this.drawPiece(ctx, i, j, gameState.board[i][j]);
                }
            }
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
    
    showSkillUsageTip(skill) {
        const tip = document.getElementById('skillUsageTip');
        if (!tip) return;
        
        document.getElementById('skillTipName').textContent = skill.name;
        document.getElementById('skillTipDescription').textContent = skill.description;
        
        tip.classList.remove('hidden');
        
        // 3秒后自动消失
        setTimeout(() => {
            this.clearSkillUsageTip();
        }, 3000);
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
}

// 游戏管理器类
class GameManager {
    constructor() {
        this.gameState = new GameState();
        this.skillSystem = new SkillSystem();
        this.uiManager = new UIManager(this);
        this.animationManager = new AnimationManager();
        this.selectedSkill = null;
        
        this.startNewGame();
    }
    
    startNewGame() {
        this.gameState = new GameState();
        this.selectedSkill = null;
        this.uiManager.render(this.gameState);
        this.uiManager.updateGameStatus();
    }
    
    handleCanvasClick(row, col) {
        if (this.gameState.gameStatus !== 'playing') return;
        
        if (this.gameState.skillMode && this.selectedSkill) {
            this.useSkill(row, col);
        } else {
            this.makeMove(row, col);
        }
    }
    
    handleCanvasHover(row, col) {
        if (this.gameState.gameStatus !== 'playing') return;
        
        if (this.gameState.skillMode) {
            this.gameState.previewPiece = { row, col };
        } else {
            if (this.isValidMove(row, col)) {
                this.gameState.previewPiece = { row, col };
            } else {
                this.clearPreview();
            }
        }
        
        this.uiManager.render(this.gameState);
    }
    
    clearPreview() {
        this.gameState.previewPiece = null;
        this.uiManager.render(this.gameState);
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
    
    makeMove(row, col) {
        if (!this.isValidMove(row, col)) return false;
        
        this.gameState.board[row][col] = this.gameState.currentPlayer;
        
        this.gameState.history.push({
            type: 'move',
            player: this.gameState.currentPlayer,
            row: row,
            col: col,
            timestamp: Date.now()
        });
        
        if (VictoryChecker.checkWin(this.gameState.board, row, col, this.gameState.currentPlayer)) {
            this.gameState.gameStatus = 'victory';
            this.gameState.winner = this.gameState.currentPlayer;
            this.uiManager.showVictoryModal(this.gameState.currentPlayer);
        } else {
            this.nextTurn();
        }
        
        this.uiManager.render(this.gameState);
        this.uiManager.updateGameStatus();
        
        return true;
    }
    
    selectSkill(skillId) {
        const skill = SKILLS[skillId];
        if (!this.skillSystem.canUseSkill(this.gameState, this.gameState.currentPlayer, skillId)) {
            return;
        }
        
        // 直接激活技能模式，不显示弹窗
        this.selectedSkill = skillId;
        this.gameState.skillMode = true;
        this.uiManager.updateGameStatus();
        
        // 显示技能使用提示
        this.showSkillUsageTip(skill);
    }
    
    activateSkill(skillId) {
        this.selectedSkill = skillId;
        this.gameState.skillMode = true;
        this.uiManager.updateGameStatus();
    }
    
    useSkill(targetRow, targetCol) {
        if (!this.selectedSkill) return false;
        
        let target = { row: targetRow, col: targetCol };
        let success = false;
        
        // 根据不同技能类型处理目标参数
        switch (this.selectedSkill) {
            case 'feishazoushi':
            case 'shiguangdaoliu':
                // 这些技能只需要目标位置
                success = this.skillSystem.useSkill(
                    this.gameState, 
                    this.gameState.currentPlayer, 
                    this.selectedSkill, 
                    target
                );
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
                    success = this.skillSystem.useSkill(
                        this.gameState, 
                        this.gameState.currentPlayer, 
                        this.selectedSkill, 
                        target
                    );
                }
                break;
                
            case 'huadweiliao':
                // 画地为牢需要中心位置
                target = { centerRow: targetRow, centerCol: targetCol };
                success = this.skillSystem.useSkill(
                    this.gameState, 
                    this.gameState.currentPlayer, 
                    this.selectedSkill, 
                    target
                );
                break;
                
            default:
                // 其他技能不需要目标参数
                success = this.skillSystem.useSkill(
                    this.gameState, 
                    this.gameState.currentPlayer, 
                    this.selectedSkill, 
                    {}
                );
        }
        
        if (success) {
            // 播放技能动画
            if (this.selectedSkill !== 'libashanxi' && this.selectedSkill !== 'shiguangdaoliu') {
                animationManager.playSkillEffect(this.selectedSkill, target);
            }
            
            this.selectedSkill = null;
            this.gameState.skillMode = false;
            
            if (this.checkGameEnd()) {
                this.uiManager.showVictoryModal(this.gameState.currentPlayer);
            } else {
                this.nextTurn();
            }
            
            this.uiManager.render(this.gameState);
            this.uiManager.updateGameStatus();
            
            // 清除技能提示
            this.clearSkillUsageTip();
        }
        
        return success;
    }
    
    findNearbySourcePiece(targetRow, targetCol) {
        const directions = [[-1,0], [1,0], [0,-1], [0,1]];
        const player = this.gameState.currentPlayer;
        
        for (let [dr, dc] of directions) {
            const sourceRow = targetRow + dr;
            const sourceCol = targetCol + dc;
            
            if (this.isValidPosition(sourceRow, sourceCol) && 
                this.gameState.board[sourceRow][sourceCol] === player) {
                return { row: sourceRow, col: sourceCol };
            }
        }
        return null;
    }
    
    showSkillUsageTip(skill) {
        // 创建技能使用提示
        const tip = document.createElement('div');
        tip.id = 'skillUsageTip';
        tip.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-bamboo-green text-white px-4 py-2 rounded-lg shadow-lg z-50';
        tip.innerHTML = `
            <div class="text-center">
                <div class="font-bold">${skill.name}</div>
                <div class="text-sm">${skill.description}</div>
                <div class="text-xs mt-1">点击棋盘上的目标位置使用技能</div>
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
            tip.remove();
        }
    }
    
    nextTurn() {
        this.skillSystem.updateCooldowns(this.gameState);
        
        const currentPlayer = this.gameState.currentPlayer;
        if (this.gameState.energy[currentPlayer] < GAME_CONFIG.maxEnergy) {
            this.gameState.energy[currentPlayer] += GAME_CONFIG.energyRegenPerTurn;
        }
        
        if (this.gameState.skipNextTurn === currentPlayer) {
            this.gameState.skipNextTurn = null;
        } else {
            this.gameState.currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        }
        
        this.selectedSkill = null;
        this.gameState.skillMode = false;
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
    // 延迟初始化以确保所有DOM元素都已加载
    setTimeout(() => {
        animationManager = new AnimationManager();
        gameManager = new GameManager();
        initBackgroundEffect();
        
        // 更新全局gameManager引用
        window.gameManager = {
            restartGame: () => gameManager.restartGame(),
            undoMove: () => gameManager.undoMove(),
            closeVictoryModal: () => gameManager.closeVictoryModal()
        };
    }, 100);
});