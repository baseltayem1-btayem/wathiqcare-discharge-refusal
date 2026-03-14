import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import {
    WorkflowDirection,
    WorkflowProgressStep,
    WorkflowStepState,
    WorkflowStepViewModel,
} from './workflow-progress-tracker.types';

@Component({
    selector: 'app-workflow-progress-tracker',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './workflow-progress-tracker.component.html',
    styleUrl: './workflow-progress-tracker.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowProgressTrackerComponent {
    @Input() steps: WorkflowProgressStep[] = [];
    @Input() language: 'ar' | 'en' = 'ar';
    @Input() direction?: WorkflowDirection;
    @Input() currentStepId?: string;
    @Input() currentStepIndex?: number;
    @Input() enableStepNavigation = true;
    @Output() stepSelected = new EventEmitter<WorkflowStepViewModel>();

    get resolvedDirection(): WorkflowDirection {
        if (this.direction) {
            return this.direction;
        }
        return this.language === 'ar' ? 'rtl' : 'ltr';
    }

    get stepViewModels(): WorkflowStepViewModel[] {
        const activeIndex = this.resolveActiveIndex();

        return this.steps.map((step, index) => {
            const derivedState = step.state ?? this.getDerivedState(index, activeIndex);

            return {
                id: step.id,
                index,
                title: this.language === 'ar' ? step.titleAr : step.titleEn,
                subtitle: this.language === 'ar' ? step.subtitleAr : step.subtitleEn,
                state: derivedState,
                clickable: Boolean(step.clickable) && this.enableStepNavigation,
            };
        });
    }

    onStepClick(step: WorkflowStepViewModel): void {
        if (!step.clickable) {
            return;
        }
        this.stepSelected.emit(step);
    }

    stateClass(state: WorkflowStepState): string {
        switch (state) {
            case 'completed':
                return 'is-completed';
            case 'current':
                return 'is-current';
            case 'warning':
                return 'is-warning';
            case 'blocked':
                return 'is-blocked';
            default:
                return 'is-upcoming';
        }
    }

    private resolveActiveIndex(): number {
        if (typeof this.currentStepIndex === 'number') {
            return this.currentStepIndex;
        }

        if (!this.currentStepId) {
            return this.steps.findIndex((step) => step.state === 'current');
        }

        return this.steps.findIndex((step) => step.id === this.currentStepId);
    }

    private getDerivedState(index: number, activeIndex: number): WorkflowStepState {
        if (activeIndex < 0) {
            return 'upcoming';
        }
        if (index < activeIndex) {
            return 'completed';
        }
        if (index === activeIndex) {
            return 'current';
        }
        return 'upcoming';
    }
}
