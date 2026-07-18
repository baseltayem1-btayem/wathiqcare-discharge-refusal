/**
 * Anchor types for anchor-relative geometry.
 */

import type { ConsentOntologyField } from "../ontology/consent-field-ontology";
import type { TextBlock } from "../extraction/document-layout-types";

export type AnchorKind = "LABEL" | "SECTION_HEADING" | "BLANK_LINE" | "CHECKBOX" | "SIGNATURE_LINE";

export type LabelAnchor = {
  kind: "LABEL";
  page: number;
  text: string;
  matchedOntologyKey: string;
  /** Text block that matched. */
  textBlock: TextBlock;
  /** Confidence that this anchor maps to the ontology key. */
  confidence: number;
  /** Language of the matched alias. */
  language: "EN" | "AR";
};

export type SectionHeadingAnchor = {
  kind: "SECTION_HEADING";
  page: number;
  text: string;
  textBlock: TextBlock;
  confidence: number;
};

export type BlankLineAnchor = {
  kind: "BLANK_LINE";
  page: number;
  x: number;
  y: number;
  width: number;
  xNorm: number;
  yNorm: number;
  widthNorm: number;
};

export type CheckboxAnchor = {
  kind: "CHECKBOX";
  page: number;
  x: number;
  y: number;
  size: number;
  xNorm: number;
  yNorm: number;
  sizeNorm: number;
  labelText?: string;
};

export type SignatureLineAnchor = {
  kind: "SIGNATURE_LINE";
  page: number;
  x: number;
  y: number;
  width: number;
  xNorm: number;
  yNorm: number;
  widthNorm: number;
  labelText?: string;
};

export type LayoutAnchor =
  | LabelAnchor
  | SectionHeadingAnchor
  | BlankLineAnchor
  | CheckboxAnchor
  | SignatureLineAnchor;

export type AnchorMatch = {
  field: ConsentOntologyField;
  anchor: LabelAnchor;
  evidence: string;
};
