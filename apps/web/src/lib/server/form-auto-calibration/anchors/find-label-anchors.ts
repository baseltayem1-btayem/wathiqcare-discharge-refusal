/**
 * Find label anchors by matching detected text blocks against the ontology
 * alias index.
 */

import type { ExtractedDocumentLayout, TextBlock } from "../extraction/document-layout-types";
import { findOntologyMatches, type OntologyAliasMatch } from "../ontology/ontology-aliases";
import type { LabelAnchor, LayoutAnchor, AnchorMatch } from "./anchor-types";

function textBlockToAnchor(block: TextBlock, match: OntologyAliasMatch): LabelAnchor {
  return {
    kind: "LABEL",
    page: block.page,
    text: block.text,
    matchedOntologyKey: match.field.key,
    textBlock: block,
    confidence: match.score,
    language: match.matchedLanguage,
  };
}

export function findLabelAnchors(layout: ExtractedDocumentLayout): AnchorMatch[] {
  const matches: AnchorMatch[] = [];

  for (const page of layout.pages) {
    for (const block of page.textBlocks) {
      const candidates = findOntologyMatches(block.text);
      for (const candidate of candidates.slice(0, 3)) {
        // Only accept reasonably confident matches.
        if (candidate.score < 0.25) continue;
        matches.push({
          field: candidate.field,
          anchor: textBlockToAnchor(block, candidate),
          evidence: `Matched alias "${candidate.matchedAlias}" (${candidate.matchedLanguage}) with score ${candidate.score.toFixed(2)}`,
        });
      }
    }
  }

  return matches;
}

export function findAllLayoutAnchors(layout: ExtractedDocumentLayout): LayoutAnchor[] {
  const anchors: LayoutAnchor[] = [];

  for (const page of layout.pages) {
    for (const block of page.textBlocks) {
      const candidates = findOntologyMatches(block.text);
      const best = candidates[0];
      if (best && best.score >= 0.5) {
        anchors.push(textBlockToAnchor(block, best));
      }
    }

    for (const line of page.writingLines) {
      anchors.push({
        kind: "BLANK_LINE",
        page: line.page,
        x: line.x,
        y: line.y,
        width: line.width,
        xNorm: line.xNorm,
        yNorm: line.yNorm,
        widthNorm: line.widthNorm,
      });
    }

    for (const box of page.checkboxes) {
      anchors.push({
        kind: "CHECKBOX",
        page: box.page,
        x: box.x,
        y: box.y,
        size: box.size,
        xNorm: box.xNorm,
        yNorm: box.yNorm,
        sizeNorm: box.sizeNorm,
      });
    }

    for (const sig of page.signatureRegions) {
      anchors.push({
        kind: "SIGNATURE_LINE",
        page: sig.page,
        x: sig.x,
        y: sig.y,
        width: sig.width,
        xNorm: sig.xNorm,
        yNorm: sig.yNorm,
        widthNorm: sig.widthNorm,
        labelText: sig.labelText,
      });
    }
  }

  return anchors;
}
