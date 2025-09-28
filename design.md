# 五子棋技能系统 - 视觉设计文档

## 设计理念

### 核心设计哲学
**"古韵新风"** - 将传统中国围棋文化与现代游戏美学相结合，创造一个既有文化底蕴又具有现代感的视觉体验。通过精心设计的视觉语言，让玩家在享受策略游戏乐趣的同时，感受到深厚的文化内涵。

### 设计原则
1. **文化传承** - 融入中国传统文化元素
2. **现代美学** - 采用现代游戏设计标准
3. **功能优先** - 确保视觉设计服务于游戏性
4. **情感共鸣** - 通过视觉设计增强游戏体验

## 色彩系统

### 主色调 - 墨色山水
```css
/* 主色彩系统 */
--ink-black: #1a1a1a        /* 墨色 - 主要文字和边框 */
--paper-white: #faf9f6      /* 宣纸白 - 背景和棋盘 */
--bamboo-green: #2d5016     /* 竹青 - 装饰和强调 */
--cinnabar-red: #b22222     /* 朱砂 - 警告和重要提示 */
--gold-accent: #d4af37      /* 金箔 - 技能和特效 */

/* 辅助色彩 */
--shadow-gray: #4a4a4a      /* 阴影色 */
--mist-blue: #6b7d8c        /* 薄雾蓝 - 次要信息 */
--warm-ivory: #f7f5f0       /* 暖象牙 - 卡片背景 */
```

### 色彩应用规则
- **背景**：使用渐变的宣纸白色调，营造纸质纹理感
- **棋盘**：深色木纹配合浅色线条，确保棋子对比度
- **棋子**：黑子使用纯黑，白子使用暖白，确保视觉清晰
- **技能**：使用金色和竹青色作为主色调，体现东方美学

## 字体系统

### 中文字体
```css
/* 标题字体 - 书法风格 */
font-family: 'Ma Shan Zheng', 'ZCOOL KuaiLe', cursive;
/* 正文字体 - 现代简洁 */
font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
/* 技能名称 - 传统风格 */
font-family: 'ZCOOL XiaoWei', 'STKaiti', serif;
```

### 字体层级
- **主标题**：48px，书法体，墨色
- **副标题**：32px，传统体，竹青色
- **正文**：16px，现代无衬线，墨色
- **技能名称**：24px，传统体，金色
- **提示文字**：14px，现代无衬线，薄雾蓝

## 视觉元素设计

### 棋盘设计
```css
/* 棋盘样式 */
.board-container {
    background: linear-gradient(45deg, #8b7355 0%, #a0845c 100%);
    border: 8px solid var(--ink-black);
    border-radius: 8px;
    box-shadow: 
        inset 0 0 20px rgba(0,0,0,0.3),
        0 10px 30px rgba(0,0,0,0.2);
}

/* 棋盘线条 */
.board-line {
    stroke: var(--ink-black);
    stroke-width: 1.5;
    opacity: 0.8;
}
```

### 棋子设计
```css
/* 黑子样式 */
.black-piece {
    fill: #000000;
    stroke: #333333;
    stroke-width: 1;
    filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
}

/* 白子样式 */
.white-piece {
    fill: #ffffff;
    stroke: #cccccc;
    stroke-width: 1;
    filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
}
```

### 技能图标设计

#### 设计原则
- **飞沙走石**：风沙粒子效果，动态模糊
- **时光倒流**：时钟倒转，时间波纹
- **力拔山兮**：山峰震动，力量感
- **固若金汤**：金色护盾，坚固质感

#### 视觉效果
```css
.skill-icon {
    background: radial-gradient(circle, var(--gold-accent), #b8860b);
    border: 2px solid var(--ink-black);
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
}

.skill-icon:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px rgba(0,0,0,0.4);
}

.skill-icon.cooldown {
    opacity: 0.5;
    filter: grayscale(0.7);
}
```

## 动画效果系统

### 核心动画库
- **Anime.js** - 主要动画引擎
- **Matter.js** - 物理效果
- **p5.js** - 创意编程和粒子效果

### 动画类型

#### 1. 界面动画
```javascript
// 页面加载动画
anime({
    targets: '.game-container',
    opacity: [0, 1],
    translateY: [50, 0],
    duration: 800,
    easing: 'easeOutQuart'
});

// 技能面板滑入
anime({
    targets: '.skill-panel',
    translateX: [300, 0],
    opacity: [0, 1],
    duration: 600,
    delay: 200,
    easing: 'easeOutCubic'
});
```

#### 2. 游戏动画
```javascript
// 落子动画
anime({
    targets: '.piece',
    scale: [0, 1],
    translateY: [-30, 0],
    duration: 400,
    easing: 'easeOutBounce'
});

// 胜利庆祝
anime({
    targets: '.winning-pieces',
    scale: [1, 1.2, 1],
    rotate: [0, 360],
    duration: 1000,
    loop: 3,
    easing: 'easeInOutSine'
});
```

#### 3. 技能特效
```javascript
// 飞沙走石粒子效果
function createSandEffect(target) {
    const particles = [];
    for (let i = 0; i < 20; i++) {
        particles.push({
            x: target.x,
            y: target.y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1.0
        });
    }
    // 粒子动画逻辑
}

// 时光倒流波纹效果
function createTimeRipple() {
    anime({
        targets: '.ripple',
        scale: [0, 3],
        opacity: [1, 0],
        duration: 1500,
        easing: 'easeOutQuart'
    });
}
```

### 背景效果

#### 使用p5.js创建动态背景
```javascript
// 粒子背景系统
let particles = [];

function setup() {
    createCanvas(windowWidth, windowHeight);
    // 初始化粒子
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle());
    }
}

function draw() {
    background(250, 249, 246, 50); // 宣纸白半透明
    
    // 更新和绘制粒子
    particles.forEach(particle => {
        particle.update();
        particle.display();
    });
}

class Particle {
    constructor() {
        this.x = random(width);
        this.y = random(height);
        this.vx = random(-0.5, 0.5);
        this.vy = random(-0.5, 0.5);
        this.size = random(2, 6);
        this.opacity = random(0.1, 0.3);
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // 边界检测
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
    }
    
    display() {
        fill(212, 175, 55, this.opacity * 255); // 金色粒子
        noStroke();
        ellipse(this.x, this.y, this.size);
    }
}
```

## 响应式设计

### 断点设置
```css
/* 桌面端 */
@media (min-width: 1200px) {
    .game-container {
        grid-template-columns: 250px 1fr 300px;
        gap: 2rem;
    }
}

/* 平板端 */
@media (min-width: 768px) and (max-width: 1199px) {
    .game-container {
        grid-template-columns: 200px 1fr 250px;
        gap: 1.5rem;
    }
}

/* 移动端 */
@media (max-width: 767px) {
    .game-container {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr auto;
    }
    
    .skill-panel {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 120px;
        overflow-x: auto;
    }
}
```

### 触摸优化
```css
/* 触摸友好设计 */
.touch-button {
    min-height: 44px;
    min-width: 44px;
    padding: 12px;
    margin: 8px;
}

/* 防止双击缩放 */
.prevent-zoom {
    touch-action: manipulation;
}
```

## 可访问性设计

### 键盘导航
```html
<!-- 键盘导航支持 -->
<div class="skill-button" 
     tabindex="0" 
     role="button"
     aria-label="使用飞沙走石技能"
     @keydown.enter="useSkill"
     @click="useSkill">
</div>
```

### 屏幕阅读器支持
```html
<!-- 游戏状态播报 -->
<div class="sr-only" role="status" aria-live="polite">
    黑子在位置7,7落子，当前轮到白方
</div>
```

### 色盲友好
```css
/* 高对比度模式 */
@media (prefers-contrast: high) {
    .board-line {
        stroke-width: 2;
        opacity: 1;
    }
    
    .black-piece {
        fill: #000000;
        stroke: #ffffff;
        stroke-width: 2;
    }
}
```

## 品牌识别

### Logo设计概念
- 融合围棋棋子与太极图案
- 使用金色和墨色作为主色调
- 体现"古韵新风"的设计理念

### 视觉识别系统
- **主色调**：墨色 + 宣纸白
- **辅助色**：竹青 + 金箔
- **字体组合**：书法体 + 现代无衬线
- **图形语言**：圆形、方形、线条的组合

这套视觉设计系统将确保游戏具有独特的视觉识别度，同时保持功能性和美观性的平衡。通过精心设计的色彩、字体和动画效果，为玩家创造一个沉浸式的游戏体验。