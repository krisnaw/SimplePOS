# SimplePOS State Diagrams

These state diagrams describe key UI and business lifecycles for the SimplePOS POS and inventory app.

## User Session State

```mermaid
stateDiagram-v2
  [*] --> Unauthenticated
  Unauthenticated --> CheckingDatabase: App starts
  CheckingDatabase --> ReadyToLogin: Database connected
  CheckingDatabase --> DatabaseUnavailable: Database error
  DatabaseUnavailable --> CheckingDatabase: Retry status check
  ReadyToLogin --> Authenticating: Submit credentials
  Authenticating --> Authenticated: Valid user
  Authenticating --> ReadyToLogin: Invalid credentials
  Authenticated --> SignedOut: Sign out
  SignedOut --> ReadyToLogin: Return to login
  Authenticated --> [*]: App closes
```

## Work Order State

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Pending: Save work order
  Draft --> Cancelled: Discard
  Pending --> InProgress: Start service
  Pending --> Cancelled: Cancel order
  InProgress --> Completed: Finish service
  InProgress --> Cancelled: Cancel order
  Completed --> Invoiced: Create paid invoice
  Completed --> InProgress: Reopen work
  Invoiced --> [*]
  Cancelled --> [*]
```

## Invoice And Payment State

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Unpaid: Generate invoice
  Draft --> Void: Cancel before payment
  Unpaid --> Paid: Confirm payment
  Unpaid --> Void: Void invoice
  Paid --> Refunded: Refund payment
  Paid --> [*]
  Refunded --> [*]
  Void --> [*]
```

## Inventory Item State

```mermaid
stateDiagram-v2
  [*] --> Active
  Active --> LowStock: stock_qty <= min_stock
  Active --> Inactive: Deactivate product
  LowStock --> Active: Restock above minimum
  LowStock --> OutOfStock: stock_qty == 0
  OutOfStock --> LowStock: Partial restock
  OutOfStock --> Active: Full restock
  LowStock --> Inactive: Deactivate product
  OutOfStock --> Inactive: Deactivate product
  Inactive --> Active: Reactivate product
  Inactive --> [*]
```
