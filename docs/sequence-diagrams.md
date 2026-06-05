# SimplePOS Sequence Diagrams

These diagrams describe the current Electron/React database and login flow, plus planned SimplePOS POS and inventory workflows.

## App Startup And Database Initialization

```mermaid
sequenceDiagram
  participant Electron as Electron Main
  participant DB as TypeORM DataSource
  participant SQLJS as SQL.js Database
  participant File as simplepos.sqlite
  participant Renderer as React Renderer

  Electron->>Electron: app.whenReady()
  Electron->>File: Check if simplepos.sqlite exists
  alt Existing database
    Electron->>File: Read database bytes
    Electron->>DB: Initialize DataSource with bytes
  else New database
    Electron->>DB: Initialize empty DataSource
  end
  DB->>SQLJS: Open SQL.js connection
  Electron->>DB: Enable foreign_keys
  Electron->>DB: Run TypeORM migrations
  DB->>SQLJS: Create/update schema
  DB->>File: Save exported database bytes
  Electron->>Renderer: Create BrowserWindow
  Renderer->>Electron: ipc db:getStatus
  Electron-->>Renderer: Database status
```

## User Login

```mermaid
sequenceDiagram
  participant User
  participant Login as Login Screen
  participant Preload as Preload API
  participant Main as Electron Main
  participant DB as TypeORM
  participant Window as BrowserWindow
  participant Dashboard as Dashboard Screen

  User->>Login: Enter email and password
  Login->>Preload: simplepos.auth.login(credentials)
  Preload->>Main: ipc auth:login
  Main->>Main: Validate IPC payload
  Main->>DB: Find active user by normalized email
  alt Valid password
    DB-->>Main: User row
    Main->>DB: Update last_login_at
    Main->>Window: Expand and unlock window
    Main-->>Preload: ok + public user
    Preload-->>Login: Login result
    Login->>Dashboard: Navigate to dashboard
  else Invalid login
    DB-->>Main: Missing user or password mismatch
    Main-->>Preload: Error message
    Preload-->>Login: Login result
    Login-->>User: Show invalid credentials
  end
```

## Create Work Order

```mermaid
sequenceDiagram
  participant Staff as Admin/Cashier
  participant UI as Work Order Screen
  participant Main as Electron Main
  participant DB as TypeORM

  Staff->>UI: Start new work order
  UI->>Main: Search/select customer
  Main->>DB: Query customers
  DB-->>Main: Customer results
  Main-->>UI: Customer list
  Staff->>UI: Select customer and vehicle
  Staff->>UI: Add services and product parts with quantity by unit type
  UI->>Main: Create work order payload
  Main->>DB: Insert work_order
  Main->>DB: Insert work_order_items
  Main->>DB: Save initial status pending
  DB-->>Main: Created work order
  Main-->>UI: Work order detail
```

## Checkout And Inventory Deduction

```mermaid
sequenceDiagram
  participant Cashier
  participant UI as Checkout Screen
  participant Main as Electron Main
  participant DB as TypeORM
  participant Inventory as Products

  Cashier->>UI: Review completed work order
  UI->>Main: Request totals
  Main->>DB: Load work order items
  DB-->>Main: Service and product lines with unit_type and unit_price
  Main-->>UI: Subtotal, tax, discount, grand total
  Cashier->>UI: Choose payment method and confirm
  UI->>Main: Create invoice
  Main->>DB: Insert invoice as paid
  Main->>DB: Mark work order invoiced
  loop For each product line
    Main->>Inventory: Deduct stock quantity in product unit_type
  end
  Main->>DB: Commit transaction
  Main-->>UI: Paid invoice and receipt data
```

## Stock Adjustment

```mermaid
sequenceDiagram
  participant Admin
  participant UI as Inventory Screen
  participant Main as Electron Main
  participant DB as TypeORM

  Admin->>UI: Open product stock adjustment
  UI->>Main: Load product
  Main->>DB: Query product by id
  DB-->>Main: Current stock details with unit_type
  Main-->>UI: Product and stock level
  Admin->>UI: Enter new quantity in product unit_type and reason
  UI->>Main: Submit adjustment
  Main->>DB: Update product stock_qty
  Main->>DB: Record adjustment metadata when stock ledger exists
  Main-->>UI: Updated product
```
