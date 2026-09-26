import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  NotebookPen,
  Plus,
  Search,
  Trash2,
  Copy,
  Download,
  Printer,
  Clock,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  CheckSquare,
  Highlighter,
  Palette,
  RotateCcw,
  IndianRupee,
  Calendar,
  X,
  Check,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const Notepad = () => {
  const { toast } = useToast();

  // Storage key
  const STORAGE_KEY = 'ayush_hub_notepad_data';

  // Notes state from localStorage (100% clean, no dummy data)
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out any legacy dummy notes
          return parsed.filter(
            (n) =>
              !['note-1', 'note-2', 'note-3'].includes(n.id) &&
              !n.title?.toLowerCase().includes('rate card verification') &&
              !n.title?.toLowerCase().includes('daily hub operational priority') &&
              !n.title?.toLowerCase().includes('shadowfax deduction')
          );
        }
      }
    } catch (e) {
      console.error('Failed to load notes from localStorage', e);
    }
    // If no notes exist, start with 1 blank note
    return [
      {
        id: `note-${Date.now()}`,
        title: 'Untitled Note',
        htmlContent: '<p>Start typing your note here...</p>',
        updatedAt: new Date().toISOString(),
      },
    ];
  });

  const [activeNoteId, setActiveNoteId] = useState(() => {
    return notes[0]?.id || '';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('Saved');
  const [stats, setStats] = useState({ words: 0, chars: 0 });

  const editorRef = useRef(null);
  const isInternalChangeRef = useRef(false);

  // Active note
  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === activeNoteId) || notes[0] || null;
  }, [notes, activeNoteId]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setAutoSaveStatus('Saved');
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [notes]);

  // When activeNote changes externally (e.g. user selects a different note in sidebar), update editorRef content
  useEffect(() => {
    if (editorRef.current && activeNote) {
      if (editorRef.current.innerHTML !== (activeNote.htmlContent || '')) {
        editorRef.current.innerHTML = activeNote.htmlContent || '';
        calculateStats(editorRef.current.innerText || '');
      }
    }
  }, [activeNoteId]);

  // Calculate words and characters count
  const calculateStats = (text) => {
    const trimmed = (text || '').trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = trimmed.length;
    setStats({ words, chars });
  };

  // Filtered notes by search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter((n) => {
      const matchTitle = (n.title || '').toLowerCase().includes(q);
      const text = (n.htmlContent || '').replace(/<[^>]*>/g, '').toLowerCase();
      const matchContent = text.includes(q);
      return matchTitle || matchContent;
    });
  }, [notes, searchQuery]);

  // Create a new blank note
  const handleCreateNote = () => {
    const newId = `note-${Date.now()}`;
    const newNote = {
      id: newId,
      title: 'Untitled Note',
      htmlContent: '<p></p>',
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(newId);
    toast.success('New note created');

    // Focus editor
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }, 100);
  };

  // Delete note
  const handleDeleteNote = (noteId, e) => {
    e?.stopPropagation();
    const remaining = notes.filter((n) => n.id !== noteId);
    setNotes(remaining);

    if (activeNoteId === noteId) {
      if (remaining.length > 0) {
        setActiveNoteId(remaining[0].id);
      } else {
        // If all deleted, create 1 fresh blank note
        const newId = `note-${Date.now()}`;
        const newNote = {
          id: newId,
          title: 'Untitled Note',
          htmlContent: '<p></p>',
          updatedAt: new Date().toISOString(),
        };
        setNotes([newNote]);
        setActiveNoteId(newId);
      }
    }
    toast.info('Note deleted');
  };

  // Update Title
  const handleTitleChange = (newTitle) => {
    setAutoSaveStatus('Saving...');
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId
          ? { ...n, title: newTitle, updatedAt: new Date().toISOString() }
          : n
      )
    );
  };

  // Update Content on user typing
  const handleEditorInput = (e) => {
    const html = e.currentTarget.innerHTML;
    const text = e.currentTarget.innerText || '';
    calculateStats(text);

    setAutoSaveStatus('Saving...');
    isInternalChangeRef.current = true;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId
          ? { ...n, htmlContent: html, updatedAt: new Date().toISOString() }
          : n
      )
    );
  };

  // Rich Text Command Executor
  const execCmd = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    // trigger content update
    const html = editorRef.current.innerHTML;
    calculateStats(editorRef.current.innerText || '');
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId
          ? { ...n, htmlContent: html, updatedAt: new Date().toISOString() }
          : n
      )
    );
  };

  // Insert Date/Time stamp
  const handleInsertTimestamp = () => {
    const now = new Date();
    const timeStr = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    execCmd('insertHTML', `<span style="background-color: #f3f4f6; color: #374151; font-weight: 600; padding: 2px 6px; border-radius: 4px; font-size: 11px;">[${timeStr}]</span>&nbsp;`);
  };

  // Insert Rupee Symbol
  const handleInsertRupee = () => {
    execCmd('insertHTML', '<strong>₹ </strong>');
  };

  // Insert Checklist Item
  const handleInsertChecklist = () => {
    const checkboxHtml = `<div style="display: flex; align-items: center; gap: 8px; margin: 6px 0;">
      <input type="checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #E53935;" />
      <span>Task item</span>
    </div>`;
    execCmd('insertHTML', checkboxHtml);
  };

  // Copy note
  const handleCopyNote = () => {
    if (!editorRef.current || !activeNote) return;
    const text = `${activeNote.title}\n\n${editorRef.current.innerText || ''}`;
    navigator.clipboard.writeText(text);
    toast.success('Note copied to clipboard');
  };

  // Download note as clean text file
  const handleDownloadNote = () => {
    if (!editorRef.current || !activeNote) return;
    const text = `${activeNote.title}\n\n${editorRef.current.innerText || ''}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(activeNote.title || 'note').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Note downloaded as .txt');
  };

  // Print note
  const handlePrintNote = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col space-y-3 pb-4">
      {/* 1. TOP HEADER */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
            <NotebookPen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Smart Notepad</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Write, edit and organize operational notes with live rich formatting
            </p>
          </div>
        </div>

        {/* New Note Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateNote}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E53935] hover:bg-[#D32F2F] text-xs font-bold text-white transition-all cursor-pointer shadow-sm hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Note</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN SPLIT INTERFACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-[560px]">
        {/* LEFT PANEL: NOTES LIST (4 Cols) */}
        <div className="lg:col-span-4 bg-white border border-[#E5E7EB] rounded-2xl p-3 shadow-2xs flex flex-col justify-between overflow-hidden">
          <div className="space-y-2.5 flex-1 flex flex-col min-h-0">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes by title or content..."
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredNotes.map((note) => {
                const isActive = note.id === activeNote?.id;
                // Preview text without HTML tags
                const plainText = (note.htmlContent || '').replace(/<[^>]*>/g, ' ').trim() || 'Empty note...';

                return (
                  <div
                    key={note.id}
                    onClick={() => setActiveNoteId(note.id)}
                    className={`relative p-3 rounded-xl border transition-all cursor-pointer select-none group ${
                      isActive
                        ? 'border-purple-500 ring-2 ring-purple-100 bg-purple-50/40 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-gray-900 truncate flex-1">
                        {note.title || 'Untitled Note'}
                      </h4>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        title="Delete note"
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Preview snippet */}
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 font-normal leading-relaxed">
                      {plainText}
                    </p>

                    {/* Date */}
                    <div className="text-[10px] text-gray-400 font-medium mt-2 pt-1 border-t border-gray-100">
                      {new Date(note.updatedAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                );
              })}

              {filteredNotes.length === 0 && (
                <div className="py-16 text-center text-gray-400">
                  <NotebookPen className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <div className="text-xs font-bold text-gray-700">No notes found</div>
                  <div className="text-[11px] mt-0.5">Click "+ New Note" to write a note</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: WYSIWYG RICH TEXT EDITOR (8 Cols) */}
        {activeNote ? (
          <div className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              {/* Note Header & Actions */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <input
                  type="text"
                  value={activeNote.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Note Title..."
                  className="flex-1 text-lg sm:text-xl font-black text-gray-900 placeholder-gray-300 focus:outline-none tracking-tight"
                />

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Auto-save status */}
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mr-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{autoSaveStatus}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyNote}
                    title="Copy note text"
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadNote}
                    title="Download as .txt"
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintNote}
                    title="Print note"
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteNote(activeNote.id, e)}
                    title="Delete note"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* RICH WYSIWYG FORMATTING TOOLBAR */}
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1 overflow-x-auto shrink-0 flex-wrap">
                {/* Bold */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd('bold');
                  }}
                  title="Bold (Ctrl+B)"
                  className="p-1.5 rounded-lg text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-2xs cursor-pointer font-bold"
                >
                  <Bold className="w-4 h-4" />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd('italic');
                  }}
                  title="Italic (Ctrl+I)"
                  className="p-1.5 rounded-lg text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-2xs cursor-pointer"
                >
                  <Italic className="w-4 h-4" />
                </button>

                {/* Underline */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd('underline');
                  }}
                  title="Underline (Ctrl+U)"
                  className="p-1.5 rounded-lg text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-2xs cursor-pointer"
                >
                  <Underline className="w-4 h-4" />
                </button>

                {/* Strikethrough */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd('strikeThrough');
                  }}
                  title="Strikethrough"
                  className="p-1.5 rounded-lg text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-2xs cursor-pointer"
                >
                  <Strikethrough className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-gray-200 mx-1" />

                {/* Heading 1 */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd('formatBlock', '<h1>');
                  }}
                  title="Main Heading (H1)"
                  className="p-1.5 rounded-lg text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-2xs cursor-pointer"
                >
                  <Heading1 className="w-4 h-4" />
                </button>

                {/* Heading 2 */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd('formatBlock', '<h2>');
                  }}
                  title="Sub Heading (H2)"
                  className="p-1.5 rounded-lg text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-2xs cursor-pointer"
                >
                  <Heading2 className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-gray-200 mx-1" />

                {/* Bullet List */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd('insertUnorderedList');
                  }}
                  title="Bullet List"
                  className="p-1.5 rounded-lg text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-2xs cursor-pointer"
                >
                  <List className="w-4 h-4" />
                </button>

                {/* Numbered List */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd('insertOrderedList');
                  }}
                  title="Numbered List"
                  className="p-1.5 rounded-lg text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-2xs cursor-pointer"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>

                {/* Interactive Checklist Item */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleInsertChecklist();
                  }}
                  title="Insert Checkbox Task"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-cyan-600" />
                  <span>+ Task</span>
                </button>

                <div className="w-px h-5 bg-gray-200 mx-1" />

                {/* Yellow Highlighter */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd('hiliteColor', '#fef08a');
                  }}
                  title="Highlight (Yellow)"
                  className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 hover:shadow-2xs cursor-pointer"
                >
                  <Highlighter className="w-4 h-4" />
                </button>

                {/* Text Color (Red/Important) */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd('foreColor', '#E53935');
                  }}
                  title="Red Text"
                  className="px-2 py-1 rounded-lg text-xs font-black text-[#E53935] hover:bg-red-50 cursor-pointer"
                >
                  A
                </button>

                {/* Text Color (Emerald/Success) */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd('foreColor', '#059669');
                  }}
                  title="Green Text"
                  className="px-2 py-1 rounded-lg text-xs font-black text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                >
                  A
                </button>

                {/* Insert Rupee */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleInsertRupee();
                  }}
                  title="Insert Rupee Symbol"
                  className="p-1.5 rounded-lg text-gray-700 hover:bg-white hover:text-gray-900 cursor-pointer font-bold"
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                </button>

                {/* Insert Timestamp */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleInsertTimestamp();
                  }}
                  title="Insert Current Date & Time"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-gray-700 hover:bg-white hover:shadow-2xs cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-purple-600" />
                  <span>Timestamp</span>
                </button>

                {/* Clear Formatting */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd('removeFormat');
                  }}
                  title="Clear Formatting"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white cursor-pointer ml-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* TRUE WYSIWYG CONTENTEDITABLE CANVAS */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                data-placeholder="Start typing your note here... Use the toolbar above to style headings, bold text, lists, highlights, or tasks directly."
                className="flex-1 w-full p-4 bg-white border border-gray-200 rounded-xl text-sm font-normal text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-400 transition-all overflow-y-auto min-h-[360px] cursor-text prose prose-sm max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
              />
            </div>

            {/* Bottom Status Bar */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100 text-[11px] text-gray-400 font-medium">
              <div>
                <span>
                  {stats.words} Words • {stats.chars} Characters
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>
                  Last modified: {new Date(activeNote.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white border border-[#E5E7EB] rounded-2xl p-12 shadow-2xs flex flex-col items-center justify-center text-center text-gray-400 min-h-[480px]">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3.5 shadow-2xs">
              <NotebookPen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900">No Note Selected</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Click below to create a clean new note.
            </p>
            <button
              type="button"
              onClick={handleCreateNote}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[#E53935] hover:bg-[#D32F2F] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Note</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
