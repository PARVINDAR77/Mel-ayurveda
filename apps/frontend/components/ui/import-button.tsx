'use client';

import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet } from 'lucide-react';
import { Button } from './button';
import { ImportModal } from './import-modal';

interface ImportButtonProps {
  mode?: 'orders' | 'leads';
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  onImportSuccess?: () => void;
}

export function ImportButton({
  mode = 'orders',
  label = 'Import from Excel',
  size = 'sm',
  className = '',
  onImportSuccess,
}: ImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={() => setIsOpen(true)}
        icon={<UploadCloud className="h-3.5 w-3.5 text-teal-700" />}
        className={`border-teal-300 text-teal-900 bg-teal-50/50 hover:bg-teal-100/70 font-bold transition shadow-2xs cursor-pointer ${className}`}
        title={`Import historical ${mode} from Excel / CSV spreadsheet`}
      >
        <span>{label}</span>
      </Button>

      {isOpen && (
        <ImportModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          mode={mode}
          onSuccess={() => {
            if (onImportSuccess) {
              onImportSuccess();
            }
          }}
        />
      )}
    </>
  );
}
