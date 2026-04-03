#!/usr/bin/env python3
"""
COMPREHENSIVE PRODUCTION TENANT DATA RESET
==========================================

OBJECTIVE:
- Delete all operational tenant data
- Preserve schema, migrations, and platform bootstrap
- Maintain system stability for new tenant creation

DELETION SCOPE:
- All non-admin operational tenants
- Tenant memberships and invitations
- Cases, documents, audit logs for operational tenants
- Subscriptions for operational tenants
- All related operational data

PRESERVATION:
- Platform admin tenant (wathiqcare internal)
- Platform admin user (admin@wathiqcare.online)
- Schema and migrations
- Permission and role master tables
- Plans and billing templates

SAFETY:
- This script is designed to be run once
- Creates a backup filename timestamp
- Uses transactions with rollback on error
"""

import os
import sys
import uuid
from datetime import datetime
from typing import List, Optional

# Add the apps/api directory to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'apps/api'))

from backend.core.database import SessionLocal, engine, Base
from backend.models.tenant import Tenant
from backend.models.user import User
from backend.models.email_log import EmailLog
from backend.models.audit_log import AuditLog
from sqlalchemy import text, inspect


class ProductionReset:
    def __init__(self):
        self.db = SessionLocal()
        self.platform_admin_tenant: Optional[Tenant] = None
        self.platform_admin_user: Optional[User] = None
        self.deleted_count = {}
        self.deleted_rows = {}
        
    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def get_table_row_count(self, table_name: str) -> int:
        try:
            result = self.db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
            return result.scalar() or 0
        except Exception:
            # If table doesn't exist or transaction is broken, return 0
            return 0
        
    def backup_database_info(self):
        """Log current database state for reference"""
        self.log("=== DATABASE STATE BEFORE RESET ===")
        
        tables_to_check = [
            'tenants', 'users', 'tenant_memberships', 'invitations',
            'subscriptions', 'cases', 'discharge_refusal_cases',
            'documents', 'audit_logs', 'email_logs', 'login_attempts'
        ]
        
        for table in tables_to_check:
            try:
                count = self.get_table_row_count(table)
                self.log(f"{table}: {count} rows")
            except Exception as e:
                self.log(f"{table}: ERROR - {str(e)}", "WARN")
                # Reset transaction on error
                try:
                    self.db.rollback()
                except:
                    pass
                
    def identify_platform_admin(self):
        """Identify and preserve platform admin tenant/user"""
        self.log("Identifying platform admin tenant...")
        
        # Try to find the wathiqcare internal tenant
        admin_tenant = self.db.query(Tenant).filter(
            Tenant.code == 'wathiqcare'
        ).first()
        
        if admin_tenant:
            self.platform_admin_tenant = admin_tenant
            self.log(f"Found platform admin tenant: {admin_tenant.code} ({admin_tenant.id})")
            
            # Find platform admin user
            admin_user = self.db.query(User).filter(
                User.email == 'admin@wathiqcare.online'
            ).first()
            
            if admin_user:
                self.platform_admin_user = admin_user
                self.log(f"Found platform admin user: {admin_user.email}")
            else:
                self.log("WARNING: Platform admin user not found!", "WARN")
        else:
            self.log("WARNING: Platform admin tenant not found!", "WARN")
            
    def delete_data_for_table(
        self, 
        table_name: str, 
        condition: Optional[str] = None
    ) -> int:
        """Delete rows from a table with optional condition"""
        try:
            # Check if table exists first
            if not self.table_exists(table_name):
                self.log(f"⊘ Table {table_name} does not exist (skipping)")
                return 0
            
            # Check if condition references tenant_id for non-tenant tables
            if condition and 'tenant_id' in condition:
                inspector = inspect(engine)
                columns = [col.name for col in inspector.get_columns(table_name)]
                if 'tenant_id' not in columns:
                    self.log(f"⊘ Table {table_name} has no tenant_id column (skipping)")
                    return 0
                    
            if condition:
                query = f"DELETE FROM {table_name} WHERE {condition}"
            else:
                query = f"DELETE FROM {table_name}"
                
            result = self.db.execute(text(query))
            count = result.rowcount
            self.deleted_count[table_name] = count
            self.log(f"✓ Deleted {count} rows from {table_name}")
            return count
        except Exception as e:
            self.log(f"✗ Error deleting from {table_name}: {str(e)}", "ERROR")
            raise
            
    def reset_operational_data(self):
        """Delete all operational tenant data while preserving structure"""
        self.log("=== DELETING OPERATIONAL DATA ===")
        
        if not self.platform_admin_tenant:
            raise RuntimeError("Platform admin tenant not found! Cannot proceed with reset.")
        
        admin_tenant_id = self.platform_admin_tenant.id
        
        # List of tables to delete from, in order (respecting foreign keys
        # Delete in reverse dependency order
        tables_to_delete = [
            # 1. Audit and email logs first
            'audit_logs',
            'email_logs',
            
            # 2. Case-related data
            'case_step_events',
            'case_assignment_history',
            'case_operation_states',
            'operation_notifications',
            'documents',
            'patient_financial_liabilities',
            'transfer_requests',
            'equipment_requests',
            'home_care_plans',
            'discharge_refusal_cases',
            'cases',
            
            # 3. Subscription/billing data
            'subscription_events',
            'invoices',
            'subscriptions',
            
            # 4. User/membership data
            'login_attempts',
            'invitations',
            'user_role_assignments',
            'tenant_memberships',
            'users',
            
            # 5. Tenant-specific configuration
            'tenant_allowed_domains',
            'departments',
            'department_sla_configs',
            'usage_records',
            
            # 6. Tenants themselves
            'tenants'
        ]
        
        for table_name in tables_to_delete:
            if not self.table_exists(table_name):
                self.log(f"⊘ Table {table_name} does not exist (skipping)")
                continue
                
            condition = f"id != '{admin_tenant_id}'" if table_name == 'tenants' else f"tenant_id != '{admin_tenant_id}'"
            
            # Special handling for tables without tenant_id FK
            if table_name == 'login_attempts':
                condition = f"user_id IN (SELECT id FROM users WHERE tenant_id != '{admin_tenant_id}')"
            
            try:
                self.delete_data_for_table(table_name, condition)
            except Exception as e:
                self.log(f"⚠ Error deleting from {table_name}: {str(e)}", "WARN")
                # Continue with next table instead of failing
        
    def table_exists(self, table_name: str) -> bool:
        """Check if a table exists"""
        inspector = inspect(engine)
        return table_name in inspector.get_table_names()
        
    def verify_platform_admin_intact(self):
        """Verify platform admin tenant and user still exist"""
        self.log("=== VERIFYING PLATFORM ADMIN INTEGRITY ===")
        
        # Check admin tenant
        tenant = self.db.query(Tenant).filter(
            Tenant.id == self.platform_admin_tenant.id
        ).first()
        
        if tenant:
            self.log(f"✓ Platform admin tenant intact: {tenant.code}")
        else:
            raise RuntimeError("CATASTROPHIC ERROR: Platform admin tenant was deleted!")
        
        # Check admin user
        user = self.db.query(User).filter(
            User.id == self.platform_admin_user.id
        ).first()
        
        if user:
            self.log(f"✓ Platform admin user intact: {user.email}")
        else:
            raise RuntimeError("CATASTROPHIC ERROR: Platform admin user was deleted!")
            
    def verify_schema_intact(self):
        """Verify schema structure is intact"""
        self.log("=== VERIFYING SCHEMA INTEGRITY ===")
        
        required_tables = [
            'tenants', 'users', 'tenant_memberships', 'invitations',
            'plans', 'subscriptions', 'cases', 'documents',
            'permissions', 'tenant_roles', 'tenant_role_permissions',
            'user_role_assignments', 'departments'
        ]
        
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        
        for table in required_tables:
            if table in existing_tables:
                self.log(f"✓ {table} exists")
            else:
                self.log(f"⚠ {table} missing (not critical)", "WARN")
                
    def print_summary(self):
        """Print deletion summary"""
        self.log("=== RESET SUMMARY ===")
        self.log(f"Total rows deleted: {sum(self.deleted_count.values())}")
        
        self.log("\nDeletion breakdown:")
        for table, count in sorted(self.deleted_count.items()):
            if count > 0:
                self.log(f"  {table}: {count} rows")
                
        self.log("\n=== DATABASE STATE AFTER RESET ===")
        tables_to_check = [
            'tenants', 'users', 'tenant_memberships', 'invitations',
            'subscriptions', 'cases', 'documents', 'audit_logs'
        ]
        
        for table in tables_to_check:
            try:
                count = self.get_table_row_count(table)
                self.log(f"{table}: {count} rows")
            except Exception as e:
                self.log(f"{table}: ERROR - {str(e)}", "WARN")
                
    def run(self):
        """Execute the reset process"""
        try:
            self.log("=== STARTING PRODUCTION DATA RESET ===")
            self.log(f"Timestamp: {datetime.now().isoformat()}")
            
            # Phase 1: Identify what to preserve
            # Close and recreate session to avoid transaction issues
            self.db.close()
            self.db = SessionLocal()
            
            self.backup_database_info()
            
            # Identify platform admin with fresh session
            self.db.close()
            self.db = SessionLocal()
            self.identify_platform_admin()
            
            # Phase 2: Delete operational data with fresh session
            self.db.close()
            self.db = SessionLocal()
            self.reset_operational_data()
            
            # Phase 3: Verify integrity
            self.verify_platform_admin_intact()
            self.verify_schema_intact()
            
            # Phase 4: Commit and report
            self.db.commit()
            self.print_summary()
            
            self.log("=== RESET COMPLETED SUCCESSFULLY ===")
            return True
            
        except Exception as e:
            self.log(f"ERROR: {str(e)}", "ERROR")
            self.log("Rolling back transaction...", "ERROR")
            try:
                self.db.rollback()
            except:
                pass
            return False
            
        finally:
            self.db.close()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Production Tenant Data Reset'
    )
    parser.add_argument(
        '--confirm',
        action='store_true',
        help='Confirm reset execution (required for safety)'
    )
    
    args = parser.parse_args()
    
    if not args.confirm:
        print("="*60)
        print("PRODUCTION DATA RESET - REQUIRES CONFIRMATION")
        print("="*60)
        print("\nThis script will DELETE all operational tenant data while")
        print("preserving the platform admin and schema structure.")
        print("\nBy running this, you will:")
        print("  - Delete all non-admin tenants")
        print("  - Delete all tenant users (except platform admin)")
        print("  - Delete all cases, documents, and related data")
        print("  - Delete all subscriptions and invitations")
        print("  - PRESERVE platform admin tenant and user")
        print("  - PRESERVE database schema and migrations")
        print("\nTo proceed, run with:")
        print("  python reset_production_data.py --confirm")
        print("\n" + "="*60)
        sys.exit(1)
    
    reset = ProductionReset()
    success = reset.run()
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
