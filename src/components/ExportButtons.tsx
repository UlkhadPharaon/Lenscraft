import React, { useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToPdf } from '../utils/exportPdf';

interface ExportButtonsProps {
  treatment: import('../types').VideoTreatment;
  /** Overrides applied to the document just before export (unsaved edits). */
  override?: import('../types').VideoTreatment;
  label?: string;
}

/** DOCX + PDF export actions used by every exportable page. */
export default function ExportButtons({ treatment, override, label = 'Exporter' }: ExportButtonsProps) {
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleDocx = async () => {
    try {
      const { exportToDocx } = await import('../utils/export');
      await exportToDocx(override ?? treatment);
      toast.success('Export DOCX téléchargé.');
    } catch (error: any) {
      toast.error(error?.message || 'Export DOCX impossible.');
    }
  };

  const handlePdf = async () => {
    setExportingPdf(true);
    try {
      await exportToPdf(override ?? treatment);
      toast.success('Export PDF téléchargé.');
    } catch (error: any) {
      toast.error(error?.message || 'Export PDF impossible.');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleDocx}
        className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-medium py-2 px-4 rounded-lg transition-colors"
        title="Télécharger au format Word"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">{label} (.docx)</span>
        <span className="sm:hidden">.docx</span>
      </button>
      <button
        type="button"
        onClick={handlePdf}
        disabled={exportingPdf}
        className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-zinc-700/50 hover:border-rose-500/50 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-60"
        title="Télécharger au format PDF"
      >
        {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        <span className="hidden sm:inline">PDF</span>
      </button>
    </div>
  );
}
