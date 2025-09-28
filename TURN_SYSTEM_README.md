# 回合管理系统重构文档

## 概述

本次重构打破了传统单一"落子-交替"的简单回合逻辑，搭建了规范化、模块化、可扩展的回合管理框架。新系统既能兼容基础五子棋规则，又能无缝承接后续复杂技能的开发与集成。

## 核心架构

### 1. 回合阶段划分

每个回合被拆解为4个固定阶段：

- **前置校验 (PRE_CHECK)**: 验证玩家行动权、棋盘状态、技能条件等
- **核心操作 (CORE_OPERATION)**: 执行落子、技能使用等核心操作
- **效果结算 (EFFECT_SETTLEMENT)**: 处理技能效果、检查游戏结束等
- **回合切换 (TURN_SWITCH)**: 更新能量、冷却、切换玩家等

### 2. 数据交互标准

所有回合操作遵循统一的数据格式：

```javascript
{
    turnId: 1,
    playerId: "black",
    operationType: "place", // "place", "skill", "undo", "pass"
    operationData: { row: 5, col: 5 },
    timestamp: 1640995200000,
    phase: "preCheck",
    status: "pending" // "pending", "executing", "completed", "failed"
}
```

### 3. 角色权责边界

- **回合管理器 (TurnManager)**: 负责流程控制、钩子执行、历史记录
- **规则校验器 (RuleValidator)**: 负责合法性判断、权限验证
- **效果执行器 (EffectExecutor)**: 负责执行操作结果、状态更新

## 核心类说明

### TurnManager (回合管理器)

```javascript
class TurnManager {
    // 注册钩子函数
    registerHook(phase, hookFunction)
    
    // 执行回合
    async executeTurn(turnData)
    
    // 创建回合数据
    createTurnData(playerId, operationType, operationData)
    
    // 注册异步效果
    registerAsyncEffect(effectId, effectFunction, timeout)
}
```

### RuleValidator (规则校验器)

```javascript
class RuleValidator {
    // 验证玩家行动权
    validatePlayerAction(playerId)
    
    // 验证落子位置
    validatePlacePosition(row, col)
    
    // 验证技能使用
    validateSkillUse(playerId, skillId)
}
```

### EffectExecutor (效果执行器)

```javascript
class EffectExecutor {
    // 执行落子效果
    executePlaceEffect(turnData)
    
    // 执行技能效果
    executeSkillEffect(turnData)
    
    // 执行回合切换效果
    executeTurnSwitchEffect(turnData)
}
```

## 可扩展性设计

### 1. 钩子系统 (Hook System)

在回合关键节点设置可配置的钩子接口：

```javascript
// 注册自定义钩子
gameState.turnManager.registerHook(TURN_PHASES.PRE_CHECK, (turnData) => {
    // 自定义前置校验逻辑
});

gameState.turnManager.registerHook(TURN_PHASES.EFFECT_SETTLEMENT, (turnData) => {
    // 自定义效果结算逻辑
});
```

### 2. 配置管理 (Configuration Management)

支持规则配置化，通过配置文件调整游戏规则：

```javascript
// 获取配置
gameConfigManager.get('allowUndo')

// 设置配置
gameConfigManager.set('skillCooldown', 3)

// 批量设置
gameConfigManager.setConfig({
    maxEnergy: 15,
    energyRegenPerTurn: 2,
    turnTimeout: 60000
})
```

### 3. 异步效果处理 (Async Effects)

支持延迟生效的技能效果：

```javascript
// 注册异步效果
const effectId = gameState.turnManager.registerAsyncEffect('freeze_effect', async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('冻结效果完成');
}, 2000);

// 检查效果状态
const status = gameState.turnManager.getAsyncEffectStatus(effectId);
```

## 使用示例

### 基础落子操作

```javascript
const result = await gameState.executeTurn(OPERATION_TYPES.PLACE, {
    row: 7,
    col: 7
});

if (result.success) {
    console.log('落子成功');
} else {
    console.log('落子失败:', result.error);
}
```

### 技能使用操作

```javascript
const result = await gameState.executeTurn(OPERATION_TYPES.SKILL, {
    skillId: 'shiguangdongjie',
    target: {}
});
```

### 自定义钩子

```javascript
// 注册悔棋权限检查
gameState.turnManager.registerHook(TURN_PHASES.PRE_CHECK, (turnData) => {
    if (turnData.operationType === OPERATION_TYPES.UNDO) {
        if (!gameConfigManager.get('allowUndo')) {
            throw new Error('当前模式不允许悔棋');
        }
    }
});
```

## 后续技能适配

### 1. 回合状态可追溯

每个回合的完整数据都被记录，支持技能效果回溯：

```javascript
// 获取回合历史
const history = gameState.getTurnHistory(10);

// 获取指定回合数据
const turnData = gameState.getTurnData(turnId);
```

### 2. 异步效果支持

支持需要延迟生效的技能：

```javascript
// 时光冻结技能示例
gameState.turnManager.registerHook(TURN_PHASES.EFFECT_SETTLEMENT, (turnData) => {
    if (turnData.operationData.skillId === 'shiguangdongjie') {
        // 注册延迟解除冻结的效果
        gameState.turnManager.registerAsyncEffect(`freeze_${turnData.turnId}`, async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            // 解除冻结逻辑
        });
    }
});
```

## 配置选项

### 基础规则配置

- `allowUndo`: 是否允许悔棋
- `skillCooldown`: 技能冷却回合数
- `maxTurnHistory`: 最大回合历史记录数
- `energyRegenPerTurn`: 每回合能量回复
- `maxEnergy`: 最大能量值
- `initialEnergy`: 初始能量值

### 回合管理配置

- `turnTimeout`: 回合超时时间
- `maxConcurrentTurns`: 最大并发回合数

### 技能系统配置

- `skillValidation`: 是否启用技能验证
- `skillAnimation`: 是否启用技能动画

### 多玩家配置

- `maxPlayers`: 最大玩家数
- `playerTypes`: 玩家类型列表

### 异步效果配置

- `asyncEffectTimeout`: 异步效果超时时间
- `maxAsyncEffects`: 最大并发异步效果数

## 迁移指南

### 从旧系统迁移

1. **落子操作**: 将 `makeMove(row, col)` 替换为 `await gameState.executeTurn(OPERATION_TYPES.PLACE, {row, col})`

2. **技能使用**: 将 `useSkill(skillId, target)` 替换为 `await gameState.executeTurn(OPERATION_TYPES.SKILL, {skillId, target})`

3. **回合切换**: 原有的 `nextTurn()` 逻辑已集成到回合管理系统中

### 新增技能开发

1. 在 `SkillSystem` 中实现技能逻辑
2. 在 `setupSkillHooks()` 中注册相关钩子
3. 如需异步效果，使用 `registerAsyncEffect()` 注册

## 性能优化

- 回合历史记录自动限制数量，避免内存泄漏
- 异步效果支持并发控制，避免资源过载
- 钩子函数支持异步执行，提高响应性

## 调试支持

- 详细的回合数据记录，便于问题排查
- 钩子执行日志，追踪执行流程
- 异步效果状态监控，确保效果正确执行

## 总结

新的回合管理系统提供了：

1. **规范化**: 明确的阶段划分和数据格式
2. **模块化**: 清晰的职责边界和接口定义
3. **可扩展**: 灵活的钩子系统和配置管理
4. **可追溯**: 完整的回合历史记录
5. **异步支持**: 支持复杂技能效果的延迟执行

这套系统为后续复杂技能的开发提供了坚实的基础，同时保持了与现有代码的兼容性。
