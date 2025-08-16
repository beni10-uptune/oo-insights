'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/firebase-auth-provider';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, Edit2, Save, X, Shield, Globe, MapPin, User } from 'lucide-react';
import { 
  getAllUsers, 
  updateUserProfile, 
  deleteUserProfile,
  createUserProfile,
  UserProfile, 
  UserRole, 
  MARKETS, 
  ROLE_PERMISSIONS 
} from '@/lib/firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

export default function FirebaseUserManagement() {
  const { userProfile, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    password: '',
    role: 'USER' as UserRole,
    markets: [] as string[],
  });
  
  const [editForm, setEditForm] = useState({
    role: '' as UserRole,
    markets: [] as string[],
    active: true,
  });

  useEffect(() => {
    if (!authLoading) {
      if (!isAdmin) {
        router.push('/');
      } else {
        fetchUsers();
      }
    }
  }, [isAdmin, authLoading, router]);

  const fetchUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password
      );
      
      // Create Firestore profile
      await createUserProfile({
        uid: userCredential.user.uid,
        email: newUser.email,
        name: newUser.name || undefined,
        role: newUser.role,
        markets: newUser.role === 'TEAM_LOCAL' ? newUser.markets : undefined,
        active: true,
        createdBy: userProfile?.uid,
      });
      
      await fetchUsers();
      setAddingUser(false);
      setNewUser({ email: '', name: '', password: '', role: 'USER', markets: [] });
    } catch (error) {
      console.error('Failed to add user:', error);
      alert((error as Error).message || 'Failed to add user');
    }
  };

  const handleUpdateUser = async (uid: string) => {
    try {
      await updateUserProfile(uid, {
        role: editForm.role,
        markets: editForm.role === 'TEAM_LOCAL' ? editForm.markets : undefined,
        active: editForm.active,
      });
      
      await fetchUsers();
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update user:', error);
      alert('Failed to update user');
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this user? They will lose all access.')) return;
    
    try {
      await deleteUserProfile(uid);
      // Note: This doesn't delete the Firebase Auth user - that requires Admin SDK
      await fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    }
  };

  const startEdit = (user: UserProfile) => {
    setEditingUser(user.uid);
    setEditForm({
      role: user.role,
      markets: user.markets || [],
      active: user.active,
    });
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return <Shield className="h-4 w-4" />;
      case 'TEAM_EUCAN': return <Globe className="h-4 w-4" />;
      case 'TEAM_LOCAL': return <MapPin className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'destructive';
      case 'TEAM_EUCAN': return 'default';
      case 'TEAM_LOCAL': return 'secondary';
      default: return 'outline';
    }
  };

  if (authLoading || loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!isAdmin) {
    return <div className="p-8">Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user access, roles, and market permissions for OO Insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Role Descriptions */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            {Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => (
              <div key={role} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getRoleIcon(role as UserRole)}
                  <Badge variant={getRoleBadgeVariant(role as UserRole)}>
                    {role.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">{perms.description}</p>
              </div>
            ))}
          </div>

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
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => setNewUser({ ...newUser, role: value as UserRole })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(ROLE_PERMISSIONS).map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <th className="text-left py-3 px-2">User</th>
                  <th className="text-left py-3 px-2">Role</th>
                  <th className="text-left py-3 px-2">Markets</th>
                  <th className="text-left py-3 px-2">Status</th>
                  <th className="text-left py-3 px-2">Created</th>
                  <th className="text-right py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid} className="border-b">
                    <td className="py-3 px-2">
                      <div>
                        <div className="font-medium">{user.name || 'Unnamed'}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      {editingUser === user.uid ? (
                        <Select
                          value={editForm.role}
                          onValueChange={(value) => setEditForm({ ...editForm, role: value as UserRole })}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(ROLE_PERMISSIONS).map((role) => (
                              <SelectItem key={role} value={role}>
                                {role.replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getRoleIcon(user.role)}
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {editingUser === user.uid && editForm.role === 'TEAM_LOCAL' ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
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
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.role === 'TEAM_LOCAL' && user.markets && user.markets.length > 0
                            ? user.markets.map((market) => (
                                <Badge key={market} variant="outline" className="text-xs">
                                  {market}
                                </Badge>
                              ))
                            : user.role === 'TEAM_EUCAN' || user.role === 'ADMIN'
                            ? <Badge variant="secondary" className="text-xs">All Markets</Badge>
                            : <span className="text-gray-500">-</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {editingUser === user.uid ? (
                        <Select
                          value={editForm.active ? 'active' : 'inactive'}
                          onValueChange={(value) => setEditForm({ ...editForm, active: value === 'active' })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={user.active ? 'default' : 'secondary'}>
                          {user.active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-500">
                      {user.createdAt.toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex gap-2 justify-end">
                        {editingUser === user.uid ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateUser(user.uid)}
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
                              disabled={user.email === userProfile?.email}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user.uid)}
                              disabled={user.email === userProfile?.email}
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