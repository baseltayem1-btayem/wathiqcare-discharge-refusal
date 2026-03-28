"""
Migration: Add workflow_actor_events table for legal actor events
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    op.create_table(
        'workflow_actor_events',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('case_id', sa.String(), sa.ForeignKey('discharge_cases.id'), nullable=False),
        sa.Column('actor_type', sa.Enum('patient', 'guardian', 'witness', 'doctor', name='actortype'), nullable=False),
        sa.Column('actor_user_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('actor_name', sa.String(), nullable=True),
        sa.Column('actor_identifier', sa.String(), nullable=True),
        sa.Column('event_type', sa.Enum('signature', 'consent_acknowledgement', 'refusal_acknowledgement', 'witness_confirmation', 'physician_confirmation', name='actoreventtype'), nullable=False),
        sa.Column('event_details', postgresql.JSON(), nullable=True),
        sa.Column('document_hash', sa.String(), nullable=True),
        sa.Column('ip_address', sa.String(), nullable=True),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

def downgrade():
    op.drop_table('workflow_actor_events')
