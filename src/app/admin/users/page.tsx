'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, Edit2, Save, X } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  markets: string[];
  createdAt: string;
}

const ROLES = [
  { value: 'ADMIN', label: 'Admin', description: 'Full system access' },
  { value: 'TEAM_EUCAN', label: 'Team EUCAN', description: 'Access to all markets' },
  { value: 'TEAM_LOCAL', label: 'Team Local', description: 'Access to specific markets' },
  { value: 'USER', label: 'User', description: 'Read-only access' },
];

const MARKETS = [
  'UK', 'Italy', 'Spain', 'France', 'Germany', 'Poland', 'Canada'
];

export default function UserManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    role: 'USER',
    markets: [] as string[],
  });
  const [editForm, setEditForm] = useState({
    role: '',
    markets: [] as string[],
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/');
    } else {
      fetchUsers();
    }
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      
      if (res.ok) {
        await fetchUsers();
        setAddingUser(false);
        setNewUser({ email: '', name: '', password: '', role: 'USER', markets: [] });
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to add user');
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('Failed to add user');
    }
  };

  const handleUpdateUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      
      if (res.ok) {
        await fetchUsers();
        setEditingUser(null);
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to update user');
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        await fetchUsers();
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user.id);
    setEditForm({
      role: user.role,
      markets: user.markets,
    });
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (session?.user?.role !== 'ADMIN') {
    return <div className="p-8">Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user access and permissions for OO Insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add User Form */}
          {addingUser && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <h3 className="font-semibold mb-4">Add New User</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="Full Name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="password">Password (Optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Leave blank for Google-only login"
                    />
                    <p className="text-xs text-gray-500 mt-1">If not set, user can only sign in with Google</p>
                  </div>
                  <div></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newUser.role === 'TEAM_LOCAL' && (
                    <div>
                      <Label>Markets</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {MARKETS.map((market) => (
                          <Badge
                            key={market}
                            variant={newUser.markets.includes(market) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              const markets = newUser.markets.includes(market)
                                ? newUser.markets.filter((m) => m !== market)
                                : [...newUser.markets, market];
                              setNewUser({ ...newUser, markets });
                            }}
                          >
                            {market}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddUser}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add User
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddingUser(false);
                      setNewUser({ email: '', name: '', password: '', role: 'USER', markets: [] });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Add User Button */}
          {!addingUser && (
            <div className="mb-6">
              <Button onClick={() => setAddingUser(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Email</th>
                  <th className="text-left py-3 px-2">Name</th>
                  <th className="text-left py-3 px-2">Role</th>
                  <th className="text-left py-3 px-2">Markets</th>
                  <th className="text-left py-3 px-2">Created</th>
                  <th className="text-right py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-3 px-2">{user.email}</td>
                    <td className="py-3 px-2">{user.name || '-'}</td>
                    <td className="py-3 px-2">
                      {editingUser === user.id ? (
                        <Select
                          value={editForm.role}
                          onValueChange={(value) => setEditForm({ ...editForm, role: value })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'default'}>
                          {ROLES.find((r) => r.value === user.role)?.label || user.role}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {editingUser === user.id && editForm.role === 'TEAM_LOCAL' ? (
                        <div className="flex flex-wrap gap-1">
                          {MARKETS.map((market) => (
                            <Badge
                              key={market}
                              variant={editForm.markets.includes(market) ? 'default' : 'outline'}
                              className="cursor-pointer text-xs"
                              onClick={() => {
                                const markets = editForm.markets.includes(market)
                                  ? editForm.markets.filter((m) => m !== market)
                                  : [...editForm.markets, market];
                                setEditForm({ ...editForm, markets });
                              }}
                            >
                              {market}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.role === 'TEAM_LOCAL' && user.markets.length > 0
                            ? user.markets.map((market) => (
                                <Badge key={market} variant="outline" className="text-xs">
                                  {market}
                                </Badge>
                              ))
                            : user.role === 'TEAM_EUCAN' || user.role === 'ADMIN'
                            ? <Badge variant="secondary" className="text-xs">All Markets</Badge>
                            : '-'}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-2 justify-end">
                        {editingUser === user.id ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateUser(user.id)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingUser(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(user)}
                              disabled={user.email === session?.user?.email}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.email === session?.user?.email}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}