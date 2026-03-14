export type WorkflowStepState = "completed" | "current" | "upcoming" | "warning" | "blocked";

export type WorkflowDirection = "rtl" | "ltr";

export interface WorkflowProgressStep {
    id: string;
    titleAr: string;
    titleEn: string;
    subtitleAr?: string;
    subtitleEn?: string;
    state?: WorkflowStepState;
    clickable?: boolean;
}

export interface WorkflowStepViewModel {
    id: string;
    index: number;
    title: string;
    subtitle?: string;
    state: WorkflowStepState;
    clickable: boolean;
}
