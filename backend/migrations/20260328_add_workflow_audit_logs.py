"""
Migration: Add workflow_audit_logs table for unified audit trail with hash chain
"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'workflow_audit_logs',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('case_id', sa.String(), sa.ForeignKey('discharge_cases.id'), nullable=False),
        sa.Column('event_category', sa.String(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('actor_type', sa.String(), nullable=True),
        sa.Column('payload_json', sa.JSON(), nullable=False),
        sa.Column('previous_hash', sa.String(), nullable=True),
        sa.Column('current_hash', sa.String(), nullable=False),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table('workflow_audit_logs')
