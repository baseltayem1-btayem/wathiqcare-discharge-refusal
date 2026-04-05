'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/design-system/tabs';
import { Button } from '@/components/design-system/button';
import { Input, Select } from '@/components/design-system/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/design-system/table';
import { Badge } from '@/components/design-system/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/design-system/card';
import { toast } from 'sonner';
import { Mail, RotateCcw, Plus, Search, AlertCircle, Clock } from 'lucide-react';

interface User {
    id: string;
    email: string;
    fullName: string;
    role: string;
    status: string;
    isActive: boolean;
    inviteStatus?: string;
    department?: string;
    lastLoginAt?: string;
    createdAt: string;
}

interface Role {
    id: string;
    code: string;
    name: string;
    description?: string;
    permissions?: string[];
}

const DEPARTMENTS = [
    { code: 'NURSING', name: 'Nursing' },
    { code: 'DOCTORS', name: 'Doctors' },
    { code: 'LABORATORY', name: 'Laboratory' },
    { code: 'PHARMACY', name: 'Pharmacy' },
    { code: 'IT', name: 'IT / Information Engineering' },
    { code: 'LEGAL', name: 'Legal Affairs' },
    { code: 'INPATIENT', name: 'Inpatient / Admission / Tanoom' },
    { code: 'FINANCE', name: 'Finance' },
    { code: 'MEDICAL_DIRECTOR', name: 'Medical Director Office' },
    { code: 'ADMIN', name: 'Administrative Management' },
];

const OPERATIONS = {
    RESEND_INVITE: 'resend-invite',
    RESET_PASSWORD: 'reset-password',
    DISABLE_USER: 'disable-user',
    ENABLE_USER: 'enable-user',
    EDIT_ROLE: 'edit-role',
    EDIT_DEPARTMENT: 'edit-department',
};

export default function TenantSecurityPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('');
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
    const [operationInProgress, setOperationInProgress] = useState<{ [key: string]: string }>({});

    // Fetch users
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/tenant/users');
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch roles
    const fetchRoles = useCallback(async () => {
        try {
            const response = await fetch('/api/tenant/roles');
            if (!response.ok) throw new Error('Failed to fetch roles');
            const data = await response.json();
            setRoles(data.roles || []);
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, [fetchUsers, fetchRoles]);

    // Handle user actions
    const handleUserAction = async (userId: string, action: string) => {
        const operationKey = `${userId}-${action}`;
        try {
            setOperationInProgress((prev) => ({ ...prev, [operationKey]: 'processing' }));

            let endpoint = '';
            let method = 'POST';
            let body: Record<string, unknown> = {};

            switch (action) {
                case OPERATIONS.RESEND_INVITE:
                    endpoint = `/api/tenant/users/${userId}/resend-invite`;
                    break;
                case OPERATIONS.RESET_PASSWORD:
                    endpoint = `/api/tenant/users/${userId}/reset-password`;
                    break;
                case OPERATIONS.DISABLE_USER:
                    endpoint = `/api/tenant/users/${userId}`;
                    method = 'PATCH';
                    body = { isActive: false };
                    break;
                case OPERATIONS.ENABLE_USER:
                    endpoint = `/api/tenant/users/${userId}`;
                    method = 'PATCH';
                    body = { isActive: true };
                    break;
                default:
                    throw new Error('Unknown action');
            }

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: method !== 'GET' ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Action failed');
            }

            setOperationInProgress((prev) => ({ ...prev, [operationKey]: 'success' }));

            // Show success message
            const actionLabels: { [key: string]: string } = {
                'resend-invite': 'Invitation resent',
                'reset-password': 'Password reset email sent',
                'disable-user': 'User disabled',
                'enable-user': 'User enabled',
            };

            toast.success(actionLabels[action] || 'Action completed');

            // Refresh users list
            setTimeout(() => {
                fetchUsers();
            }, 500);
        } catch (error) {
            setOperationInProgress((prev) => ({ ...prev, [operationKey]: 'error' }));
            console.error('Error:', error);
            toast.error(error instanceof Error ? error.message : 'Action failed');
        } finally {
            setTimeout(() => {
                setOperationInProgress((prev) => {
                    const newState = { ...prev };
                    delete newState[operationKey];
                    return newState;
                });
            }, 2000);
        }
    };

    // Filter users
    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDepartment = !selectedDepartmentFilter || user.department === selectedDepartmentFilter;
        const matchesRole = !selectedRoleFilter || user.role === selectedRoleFilter;

        return matchesSearch && matchesDepartment && matchesRole;
    });

    // Get status badge
    const getStatusBadge = (user: User) => {
        if (user.inviteStatus === 'PENDING') {
            return <Badge variant="outline" className="bg-yellow-50"><Clock className="w-3 h-3 mr-1" />Invited</Badge>;
        }
        if (!user.isActive) {
            return <Badge variant="secondary">Disabled</Badge>;
        }
        return <Badge variant="default">Active</Badge>;
    };

    return (
        <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Security & Permissions</h1>
                    <p className="text-gray-600 mt-2">Manage users, roles, and access permissions for your organization</p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="users">User Management</TabsTrigger>
                        <TabsTrigger value="permissions">Roles & Permissions</TabsTrigger>
                    </TabsList>

                    {/* Users Tab */}
                    <TabsContent value="users" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Users</CardTitle>
                                <CardDescription>Create, invite, and manage users in your organization</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Search and Filters */}
                                <div className="flex gap-4 flex-wrap">
                                    <div className="flex-1 min-w-[200px] relative">
                                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                        <Input
                                            placeholder="Search by email or name..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    <Select
                                        className="w-[220px]"
                                        value={selectedDepartmentFilter}
                                        onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                                    >
                                        <option value="">All Departments</option>
                                        {DEPARTMENTS.map((dept) => (
                                            <option key={dept.code} value={dept.code}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </Select>
                                    <Select
                                        className="w-[220px]"
                                        value={selectedRoleFilter}
                                        onChange={(e) => setSelectedRoleFilter(e.target.value)}
                                    >
                                        <option value="">All Roles</option>
                                        {roles.map((role) => (
                                            <option key={role.id} value={role.code}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </Select>
                                    <Button onClick={() => router.push('/tenant/users')}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create User
                                    </Button>
                                </div>

                                {/* Users Table */}
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Role</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Last Login</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                                        Loading users...
                                                    </TableCell>
                                                </TableRow>
                                            ) : filteredUsers.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                                        No users found
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredUsers.map((user) => {
                                                    const operationKey = (action: string) => `${user.id}-${action}`;
                                                    return (
                                                        <TableRow key={user.id}>
                                                            <TableCell className="font-mono text-sm">{user.email}</TableCell>
                                                            <TableCell>{user.fullName}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{user.role}</Badge>
                                                            </TableCell>
                                                            <TableCell>{user.department || '-'}</TableCell>
                                                            <TableCell>{getStatusBadge(user)}</TableCell>
                                                            <TableCell className="text-sm">
                                                                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                                                            </TableCell>
                                                            <TableCell className="text-right space-x-2">
                                                                {user.inviteStatus === 'PENDING' && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        disabled={!!operationInProgress[operationKey(OPERATIONS.RESEND_INVITE)]}
                                                                        onClick={() => handleUserAction(user.id, OPERATIONS.RESEND_INVITE)}
                                                                        title="Resend invitation email"
                                                                    >
                                                                        <Mail className="w-4 h-4 mr-1" />
                                                                        Resend
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={!!operationInProgress[operationKey(OPERATIONS.RESET_PASSWORD)]}
                                                                    onClick={() => handleUserAction(user.id, OPERATIONS.RESET_PASSWORD)}
                                                                    title="Send password reset email"
                                                                >
                                                                    <RotateCcw className="w-4 h-4 mr-1" />
                                                                    Reset
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Permissions Tab */}
                    <TabsContent value="permissions" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Roles & Permissions</CardTitle>
                                <CardDescription>Manage roles and permissions for your organization</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-12 text-gray-500">
                                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Permission matrix will be displayed here</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </main>
    );
}
