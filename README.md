# SimplePOS

A modern, efficient Point of Sale (POS) and Inventory management application specifically designed for Car Repair Shops. Built with Electron, React, and TypeScript.

## 🚀 Overview

SimplePOS streamlines the operations of an automotive service business. From managing customer vehicle records to tracking parts inventory and generating professional invoices, SimplePOS provides a comprehensive toolset for workshop owners and managers.

## ✨ Key Features

- **Work Order Management**: Create and track repair jobs from start to finish.
- **Customer & Vehicle Database**: Maintain detailed records of customers and their vehicles (Make, Model, Plate Number).
- **Inventory Tracking**: Manage parts and products with real-time stock levels and low-stock alerts.
- **Service Catalog**: Define standard services and labor rates.
- **Invoicing & Payments**: Generate professional invoices and record payments from POS and work-order checkout.
- **User Roles**: Secure access control for admins, mechanics, and cashiers.
- **Dashboard Overview**: Get a bird's-eye view of your business performance.

## 🛠 Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/)
- **Database**: [SQLite](https://www.sqlite.org/) with [TypeORM](https://typeorm.io/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/simplepos.git
    cd simplepos
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running the App

To start the application in development mode:
```bash
npm run dev
```

To build the application:
```bash
npm run build
```

## 📂 Project Structure

- `src/main`: Electron main process, database configuration, and IPC handlers.
- `src/app`: Application logic, types, and workspace components.
- `src/components`: Reusable UI components (Shadcn UI).
- `src/pages`: Top-level page components (Login, Dashboard).
- `docs`: Detailed documentation including ERD, architecture, and sample data.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
