import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/renderer/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/renderer/components/ui/card'
import { Checkbox } from '@/renderer/components/ui/checkbox'
import { Input } from '@/renderer/components/ui/input'
import { Label } from '@/renderer/components/ui/label'
import { BaseSelect } from '@/renderer/components/ui/base-select'
import { cn } from '@/renderer/lib/utils'
import type { AuthenticatedUser, UserRole, UserSummary } from '@/shared/types/user'

export function UserManagement({ currentUser }: { currentUser: AuthenticatedUser }) {
  const [users, setUsers] = useState<UserSummary[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('cashier')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const canManageUsers = currentUser.role === 'admin'
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    window.simplepos?.users.list()
      .then((userList) => {
        if (!isMounted) return

        setUsers(userList)
      })
      .catch((error) => {
        if (!isMounted) return

        setMessage(error instanceof Error ? error.message : 'Unable to load users')
      })
      .finally(() => {
        if (!isMounted) return

        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  function resetForm() {
    setSelectedUserId(null)
    setName('')
    setEmail('')
    setRole('cashier')
    setPassword('')
    setIsActive(true)
    setMessage('')
  }

  function selectUser(user: UserSummary) {
    setSelectedUserId(user.id)
    setName(user.name)
    setEmail(user.email)
    setRole(user.role)
    setPassword('')
    setIsActive(user.isActive)
    setMessage('')
  }

  async function refreshUsers() {
    const userList = await window.simplepos?.users.list()

    setUsers(userList ?? [])
  }

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canManageUsers) {
      setMessage('Only admins can manage users')
      return
    }

    setIsSaving(true)
    setMessage('')

    try {
      const result = selectedUser
        ? await window.simplepos?.users.update({
            id: selectedUser.id,
            email,
            name,
            role,
            isActive,
            password: password || undefined,
          })
        : await window.simplepos?.users.create({
            email,
            name,
            role,
            password,
          })

      setMessage(result?.message ?? 'User service unavailable')

      if (result?.ok) {
        await refreshUsers()
        resetForm()
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save user')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>Admins can manage cashier and admin access.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="grid grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr] gap-3 border-b bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span>Last Login</span>
            </div>

            <div className="divide-y">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">Loading users...</p>
                </div>
              ) : null}

              {!isLoading && users.length === 0 ? (
                <div className="px-3 py-6 text-sm text-muted-foreground">No users found</div>
              ) : null}

              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => selectUser(user)}
                  className={cn(
                    'grid w-full grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr] gap-3 px-3 py-3 text-left text-sm transition-colors hover:bg-muted/60',
                    selectedUserId === user.id && 'bg-muted',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                  </span>
                  <span className="capitalize">{user.role}</span>
                  <span className={cn('text-xs font-medium', user.isActive ? 'text-foreground' : 'text-muted-foreground')}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{selectedUser ? 'Edit User' : 'Create User'}</CardTitle>
          <CardDescription>
            {selectedUser ? 'Update account details or reset the password.' : 'Add an admin or cashier account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canManageUsers ? (
            <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
              You are signed in as a cashier. Only admin users can create or edit accounts.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="user-name">Name</Label>
                <Input
                  id="user-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Cashier Name"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="cashier@simplepos.com"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="user-role">Role</Label>
                <BaseSelect
                  id="user-role"
                  value={role}
                  ariaLabel="User role"
                  options={[
                    { value: 'cashier', label: 'Cashier' },
                    { value: 'admin', label: 'Admin' },
                  ]}
                  onValueChange={(value) => setRole(value as UserRole)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="user-password">{selectedUser ? 'New Password' : 'Password'}</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={selectedUser ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                  required={!selectedUser}
                />
              </div>

              {selectedUser ? (
                <label className="flex min-h-10 items-center gap-2 text-sm">
                  <Checkbox
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  Active account
                </label>
              ) : null}

              {message ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {message}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving' : selectedUser ? 'Update User' : 'Create User'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Clear
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
