import { Routes } from '@angular/router';
import { CaseDetailsWorkflowTrackerExampleComponent } from './features/cases/case-details/case-details-workflow-tracker.example.component';

export const routes: Routes = [
    {
        path: 'workflow-tracker-demo',
        component: CaseDetailsWorkflowTrackerExampleComponent,
    },
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'workflow-tracker-demo',
    },
];
