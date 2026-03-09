import PrimaryActionButton from "@/ui/components/PrimaryActionButton";
import SecondaryActionButton from "@/ui/components/SecondaryActionButton";

type PDFActionBarProps = {
  onPreview?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
};

export default function PDFActionBar({ onPreview, onDownload, onShare }: PDFActionBarProps) {
  return (
    <div className="ui-panel flex flex-wrap items-center gap-2 p-3">
      <PrimaryActionButton type="button" onClick={onPreview}>Preview PDF</PrimaryActionButton>
      <SecondaryActionButton type="button" onClick={onDownload}>Download</SecondaryActionButton>
      <SecondaryActionButton type="button" onClick={onShare}>Share</SecondaryActionButton>
    </div>
  );
}
