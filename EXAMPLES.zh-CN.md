# AnyHarness v3 示例

## 1. 老 Java 电商项目

用户：

```text
Use AnyHarness to adopt this existing repository safely.
```

AnyHarness 扫描后输出：

```text
Detected stack:
- Java / Spring Boot
- REST API
- SQL migrations
- Messaging signals

Domain hypotheses:
- ecommerce/payment: medium confidence
- inventory consistency: medium confidence

Evidence:
- OrderService.java
- PaymentCallbackController.java
- InventoryReservationRepository.java
- docs/checkout.md
```

然后先问问题，再生成项目规则。

## 2. Electron 客户端

AnyHarness 不应该只套通用 Web 规则。它应该发现：

```text
main process
renderer process
preload bridge
ipcMain / ipcRenderer
本地文件访问
auto updater
```

然后创建专家角色：

```text
Electron Security Reviewer
IPC Boundary Reviewer
Local Storage and Secrets Reviewer
Desktop Release Reviewer
```

## 3. C++ 交易服务

AnyHarness 应该发现领域信号：

```text
market_data
order_book
execution_report
venue
risk_check
sequence number
replay
```

然后询问：

```text
是否有延迟 SLO？
hot path 是否要求无堆分配？
重复或乱序消息如何处理？
订单状态机在哪里定义？
```

## 4. 跨模型 review packet

不要直接把一段代码丢给另一个模型。应该让 AnyHarness 生成上下文包：

```text
Use AnyHarness to create a performance review packet for the staged diff.
```

再把 packet 给另一个模型，让它只执行指定专家角色。
