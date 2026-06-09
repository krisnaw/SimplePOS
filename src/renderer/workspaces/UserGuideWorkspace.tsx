import { BookOpen, Boxes, LayoutDashboard, ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { cn } from '@/renderer/lib/utils'

type GuideSection = {
  id: string
  title: string
  description: string
  steps: string[]
}

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
      'Review the current user, work order count, and inventory alerts.',
      'Use the sidebar to move into Sales or Inventory when you are ready to work.',
      'Check the System panel at the bottom of the sidebar for database, printer, and scanner status.',
    ],
  },
  {
    id: 'sales',
    title: 'Sales / POS',
    description: 'Build a sale by searching products and checking out from the order summary.',
    steps: [
      'Go to Sales to open the product catalog on the left and Current Sale on the right.',
      'Search by product name, SKU, category, or description, or filter with the category chips.',
      'Review price, stock level, and low-stock badges on each product card.',
      'Click Add on a product to place it in the cart. Quantities can be increased until stock runs out.',
      'Adjust item quantities with the plus and minus controls in the order summary.',
      'Review subtotal, tax, and total in the Current Sale panel.',
      'Click Checkout to complete the sale. Use Clear to reset the cart and start again.',
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description: 'Track parts, stock levels, and product details used by the POS.',
    steps: [
      'Open Inventory to view product counts, total stock units, and low-stock alerts.',
      'Search the product list by name, SKU, or category.',
      'Select a product to review SKU, price, unit type, stock quantity, and minimum stock level.',
      'Use the product form on the right to add a new item or update an existing one.',
      'Set minimum stock carefully so low-stock warnings appear before items run out.',
      'Mark products as sellable when they should appear in the Sales workspace.',
      'Keep stock quantities accurate so Sales cannot oversell unavailable parts.',
    ],
  },
  {
    id: 'daily-workflow',
    title: 'Recommended Daily Workflow',
    description: 'A simple routine for running the shop with POS and inventory together.',
    steps: [
      'Start the day on the Dashboard and confirm system status is online.',
      'Check Inventory for low-stock items and update quantities after deliveries arrive.',
      'Use Sales throughout the day to add parts and service items to customer transactions.',
      'Review Reports and completed sales as needed for end-of-day reconciliation.',
      'Use Settings and Users to maintain shop preferences and staff access.',
    ],
  },
  {
    id: 'help',
    title: 'Need More Help?',
    description: 'What to do when something is missing or not working.',
    steps: [
      'If a product does not appear in Sales, confirm it exists in Inventory and is marked sellable.',
      'If stock errors appear during checkout, update the product quantity in Inventory first.',
      'If login fails, verify your email and password with your shop administrator.',
      'For access issues, printer setup, or missing features, contact your system administrator.',
    ],
  },
]

const quickLinks = [
  { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sales', label: 'Sales / POS', icon: ShoppingCart },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
]

export function UserGuideWorkspace() {
  return (
    <div className="flex min-h-0 flex-col gap-4">
      <Card className="border-0 shadow-border">
        <CardHeader className="gap-2 pb-4">
          <CardTitle className="text-base text-balance">How to Use SimplePOS</CardTitle>
          <CardDescription className="text-pretty">
            Practical instructions for using the POS and Inventory workspaces in this app.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {quickLinks.map((link) => {
            const Icon = link.icon

            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted/80 hover:text-foreground active:scale-[0.96]"
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {link.label}
              </a>
            )
          })}
        </CardContent>
      </Card>

      <div className="stagger-children grid gap-4 xl:grid-cols-2">
        {guideSections.map((section) => (
          <Card
            key={section.id}
            id={section.id}
            className="scroll-mt-4 border-0 shadow-border"
          >
            <CardHeader className="gap-1">
              <CardTitle className="text-base text-balance">{section.title}</CardTitle>
              <CardDescription className="text-pretty">{section.description}</CardDescription>
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

      <Card className={cn('border-0 shadow-border')}>
        <CardHeader className="gap-1">
          <CardTitle className="text-base text-balance">Role Access</CardTitle>
          <CardDescription className="text-pretty">What each account type is intended to do.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
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
