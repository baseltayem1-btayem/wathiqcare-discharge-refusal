"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  children: ReactNode;
  sectionName?: string;
};

type State = {
  hasError: boolean;
  errorMessage: string | null;
};

/**
 * Class-based React error boundary that wraps an individual page section.
 * If the child subtree throws during render, it shows a recovery card
 * without crashing the rest of the page.
 */
export default class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return { hasError: true, errorMessage: message };
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900">
                {this.props.sectionName ?? "Section"} failed to render
              </h3>
              {this.state.errorMessage && (
                <p className="mt-1 text-xs text-amber-800">
                  {this.state.errorMessage}
                </p>
              )}
              <button
                type="button"
                onClick={this.handleReset}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
