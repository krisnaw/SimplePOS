import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import type { GuideSection } from './UserGuideWorkspace.types'

const guideSections: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Sign in and understand what you can access based on your role.',
    steps: [
      'Launch SimplePOS and sign in with your email and password.',
      'Wait for the database status indicator on the login screen to show connected.',
      'After sign-in, the sidebar shows the workspaces available to your account.',
      'Admin accounts can manage inventory, users, reports, and settings. Cashier accounts focus on daily sales and customer-facing work.',
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Use the dashboard for a quick read on shop activity.',
    steps: [
      'Open Dashboard from the sidebar to see session details and summary cards.',
      'Review the current user, invoice activity, and inventory alerts.',
      'Use the sidebar to move into Sales, Vehicles, or Invoices when you are ready to work.',
      'Check the System panel at the bottom of the sidebar for database and printer status.',
    ],
  },
  {
    id: 'cashier-workflow',
    title: 'Cashier Workflow',
    description: 'Follow this flow for a normal customer-facing checkout.',
    steps: [
      'Start on Dashboard and confirm the database indicator is online before taking payments.',
      'Open Sales and find or add the vehicle through Vehicle Intake.',
      'If the vehicle already has an open sale, continue it from In Progress.',
      'Add products and services, then confirm quantities, adjusted prices, and the exact cash total.',
      'Click Checkout and confirm full cash was received. The app completes the sale, creates a paid invoice and cash payment, and reduces product stock.',
      'Open Invoices to find the new invoice by plate and review vehicle, customer, line-item, payment, and total details.',
      'Return to Sales and select the next vehicle.',
    ],
  },
  {
    id: 'sales',
    title: 'Sales / POS',
    description: 'Create vehicle-linked drafts, add products and services, and complete cash checkout.',
    steps: [
      'Use Vehicle Intake to search by plate, vehicle, customer, phone, or notes. Add the vehicle when no record exists.',
      'Selecting a vehicle creates one open sale; selecting a vehicle with an existing sale activates that draft.',
      'Use In Progress to switch between all ongoing sales without searching again. Drafts older than seven days show Stale.',
      'Add products and services from the catalog and adjust quantities in Current Sale.',
      'Use the edit-price action to set an effective unit price. Adjusted lines retain the catalog price and show an Adjusted badge.',
      'Delete an unfinished sale only when it is no longer needed; deletion is permanent and does not change stock.',
      'Review the exact total, click Checkout, and confirm that full cash was received.',
      'Successful checkout removes the draft, creates a paid invoice and cash payment, and reduces product stock.',
    ],
  },
  {
    id: 'vehicles',
    title: 'Vehicles',
    description: 'Keep vehicle and customer-contact records accurate for Sales and invoice lookup.',
    steps: [
      'Open Vehicles to search existing records before creating a duplicate.',
      'Keep plate, make, model, year, color, customer, phone, and notes accurate.',
      'Every sale starts from a vehicle selected in Vehicle Intake.',
      'Return to Sales after vehicle details are ready.',
    ],
  },
  {
    id: 'invoices',
    title: 'Invoices / Receipts',
    description: 'Use invoices to review completed checkouts and provide receipt details.',
    steps: [
      'Open Invoices after checkout to find the sale by plate, invoice number, customer, payment, status, or date.',
      'Select an invoice to review vehicle, customer, phone, product and service lines, totals, and cash payment status.',
      'Use the receipt preview to confirm vehicle details, subtotal, total, and payment amount.',
      'Use Preview or Print when the customer asks for a copy.',
      'If an invoice is missing, return to Sales and confirm checkout completed successfully.',
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description: 'Track products, supplier purchases, pending invoice details, and unpaid supplier invoices.',
    steps: [
      'Open Inventory and use Products to view product counts, total stock units, and low-stock alerts.',
      'Search Products by name, SKU, or category.',
      'Select a product to review SKU, price, unit type, stock quantity, and minimum stock level.',
      'Use the product form on the right to add a new item or update an existing one.',
      'Set minimum stock carefully so low-stock warnings appear before items run out.',
      'Keep product records active when they should appear in the Sales workspace.',
      'Use Purchases when stock arrives from a supplier so latest purchase cost is recorded with the stock increase, even if invoice details arrive later.',
      'Use Movements to inspect stock in, stock out, manual adjustments, the source reference, user, and running balance for each product.',
      'Use Adjust on a product only when the counted on-hand quantity differs from the system balance. Enter the new counted quantity and a clear reason.',
      'Past movements are read-only. Corrections are recorded as new adjustments so the stock audit trail remains intact.',
    ],
  },
  {
    id: 'supplier-purchases',
    title: 'Supplier Purchases',
    description: 'Record incoming stock and track whether the supplier invoice has been paid.',
    steps: [
      'Open Inventory, choose Purchases, and click Record Purchase.',
      'Select an active supplier. Use Manage Suppliers to add or update a supplier before continuing when needed.',
      'Enter the supplier invoice number and invoice date when known. Leave them blank when goods arrive before the supplier invoice.',
      'Add each purchased product once, enter its received quantity and unit purchase cost, and review every line total and the invoice total. Product lines stay editable until posting.',
      'Click Review and Save and confirm the posting only after checking the received products. Posting immediately adds the quantities to stock and cannot be reversed in this version.',
      'Use Purchases to open the saved invoice and review its supplier, items, costs, and payment status.',
      'Use Needs Invoice to find purchases missing invoice details. Open the purchase, click Edit Invoice, and complete invoice number, date, due date, payment status, and notes.',
      'Use Unpaid to find outstanding invoices. Open an invoice and click Mark as Paid after it is settled; this changes payment status without changing stock again.',
      'Posted products, quantities, costs, supplier, and total cannot be edited. Only invoice metadata and payment status can be updated from purchase detail.',
    ],
  },
  {
    id: 'daily-workflow',
    title: 'Recommended Daily Workflow',
    description: 'A simple routine for running the shop with POS and inventory together.',
    steps: [
      'Start the day on the Dashboard and confirm system status is online.',
      'Cashiers should prepare Sales, Customers, and Invoices before serving customers.',
      'Use Sales throughout the day to add products and service items to customer transactions.',
      'Record supplier deliveries in Inventory > Purchases as soon as stock is received.',
      'Review Inventory > Needs Invoice for received goods missing invoice details, then Inventory > Unpaid for supplier invoices that need payment.',
      'Use Invoices to confirm completed checkouts and provide receipt details.',
      'Tell an admin when inventory is low, prices are wrong, or a product/service is missing.',
    ],
  },
  {
    id: 'help',
    title: 'Need More Help?',
    description: 'What to do when something is missing or not working.',
    steps: [
      'If a product does not appear in Sales, confirm it exists in Inventory and is marked sellable.',
      'If newly received stock is missing, confirm the supplier purchase appears in Inventory > Purchases before changing stock manually.',
      'If a supplier cannot be selected, open Manage Suppliers and confirm the supplier is active.',
      'If received goods are missing invoice details, open Inventory > Needs Invoice and complete the invoice from purchase detail.',
      'If a supplier invoice is rejected as a duplicate, search Purchases for the same supplier and invoice number.',
      'If an invoice does not appear, confirm the checkout success message was shown in Sales.',
      'If login fails, verify your email and password with your shop administrator.',
      'For access issues, printer setup, or missing features, contact your system administrator.',
    ],
  },
]

export function UserGuideWorkspace() {
  return (
    <div className="flex min-h-0 flex-col gap-4 p-1">

      <div className="stagger-children grid gap-4 xl:grid-cols-2">
        {guideSections.map((section) => (
          <Card
            key={section.id}
            id={section.id}
          >
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="flex list-decimal flex-col gap-2 pl-4 text-sm text-pretty">
                {section.steps.map((step) => (
                  <li key={step} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Access</CardTitle>
          <CardDescription>What each account type is intended to do.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-4">
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-sm font-medium">Admin</p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Full access to inventory, users, reports, settings, and sales operations.
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-sm font-medium">Cashier</p>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              Focused on sales, customers, and day-to-day shop transactions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
