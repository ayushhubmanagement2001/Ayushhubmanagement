import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FileText, ChevronDown } from 'lucide-react';

/**
 * Reusable Company-Aware Sample Template Dropdown
 * 
 * - Default click: Downloads template for the currently active global company.
 * - Dropdown menu: Allows downloading templates for any other company in .xlsx and .csv formats.
 */
export const SampleTemplateDropdown = ({
  currentCompany,
  companies = [],
  onDownload,
  label = 'Sample Template',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 280,
  });

  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = Math.min(280, viewportWidth - 16);

    let left = rect.left;
    if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    let top = rect.bottom + 6;
    if (top + 260 > viewportHeight && rect.top > 260) {
      top = Math.max(8, rect.top - 6);
    }

    setCoords({
      top,
      left,
      width: menuWidth,
    });
  }, []);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const activeCompanies = companies.filter((c) => c.status === 'Active' || !c.status);
  const activeCurrent = currentCompany || activeCompanies[0];

  const handleDownload = (format, targetComp) => {
    setIsOpen(false);
    if (onDownload) {
      onDownload(format, targetComp || activeCurrent);
    }
  };

  const toggleOpen = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative inline-flex ${className}`} ref={dropdownRef}>
      <div ref={triggerRef} className="inline-flex rounded-xl shadow-xs border border-gray-200 bg-white overflow-hidden">
        {/* Main download button for currently selected company */}
        <button
          type="button"
          onClick={() => handleDownload('xlsx', activeCurrent)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 border-r border-gray-200 transition-colors cursor-pointer select-none"
          title={`Download ${activeCurrent?.name || 'Company'} Sample Template`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label}</span>
        </button>

        {/* Dropdown toggle button */}
        <button
          type="button"
          onClick={toggleOpen}
          className="px-2 py-1.5 sm:py-2 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center cursor-pointer select-none"
          title="Choose Company Template"
        >
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Company Dropdown Menu via React Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] bg-white border border-gray-100 rounded-2xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-100"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3.5 py-1.5 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Download Sample Template
              </p>
            </div>

            <div className="py-1 max-h-60 overflow-y-auto divide-y divide-gray-50">
              {/* Current Active Company Section */}
              {activeCurrent && (
                <div className="px-3.5 py-2 hover:bg-gray-50/80 flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900 truncate">
                        {activeCurrent.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded-sm text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                        CURRENT
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 truncate">
                      Default selected company template
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownload('xlsx', activeCurrent)}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      title="Excel (.xlsx)"
                    >
                      XLSX
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload('csv', activeCurrent)}
                      className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                      title="CSV (.csv)"
                    >
                      CSV
                    </button>
                  </div>
                </div>
              )}

              {/* Other Active Companies */}
              {activeCompanies
                .filter((c) => (c.id || c._id) !== (activeCurrent?.id || activeCurrent?._id))
                .map((comp) => (
                  <div
                    key={comp.id || comp._id}
                    className="px-3.5 py-2 hover:bg-gray-50/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-gray-800 truncate">
                        {comp.name}
                      </span>
                      <span className="text-[10px] text-gray-400 truncate">
                        {comp.code || 'Company template'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownload('xlsx', comp)}
                        className="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        title="Excel (.xlsx)"
                      >
                        XLSX
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload('csv', comp)}
                        className="px-2 py-1 bg-gray-100 text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                        title="CSV (.csv)"
                      >
                        CSV
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

